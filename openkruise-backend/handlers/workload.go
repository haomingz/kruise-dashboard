package handlers

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/response"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// GetWorkload returns a specific workload by type and name
func GetWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	workload, err := GetDynamicClient().Resource(info.GVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get workload",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	response.Success(c, workload)
}

// GetWorkloadPods returns pods related to a specific workload
func GetWorkloadPods(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	workload, err := GetDynamicClient().Resource(info.GVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get workload for pods",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	// Extract selector labels from the workload
	labelSelector := extractLabelSelector(workload.Object)

	// If no selector found, use a fallback based on workload name
	if labelSelector == "" {
		labelSelector = "app=" + name
	}

	// Get pods using the label selector
	podGVR := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}
	pods, err := GetDynamicClient().Resource(podGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		logger.Log.Error("Failed to list pods",
			zap.String("namespace", namespace),
			zap.String("labelSelector", labelSelector),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	// Filter pods by owner reference
	items := filterPodsByOwner(pods.Items, name, info.Kind)

	response.Success(c, gin.H{
		"workload": workload.Object,
		"pods":     items,
	})
}

// extractLabelSelector extracts the label selector string from a workload object
func extractLabelSelector(workloadObj map[string]interface{}) string {
	spec, ok := workloadObj["spec"].(map[string]interface{})
	if !ok {
		return ""
	}
	selector, ok := spec["selector"].(map[string]interface{})
	if !ok {
		return ""
	}

	// Handle matchLabels
	if matchLabels, ok := selector["matchLabels"].(map[string]interface{}); ok {
		var labels []string
		for key, value := range matchLabels {
			if valueStr, ok := value.(string); ok {
				labels = append(labels, key+"="+valueStr)
			}
		}
		if len(labels) > 0 {
			result := labels[0]
			for i := 1; i < len(labels); i++ {
				result += "," + labels[i]
			}
			return result
		}
	}

	// Handle matchExpressions if matchLabels is empty
	if matchExpressions, ok := selector["matchExpressions"].([]interface{}); ok {
		var expressions []string
		for _, expr := range matchExpressions {
			exprMap, ok := expr.(map[string]interface{})
			if !ok {
				continue
			}
			key, ok := exprMap["key"].(string)
			if !ok {
				continue
			}
			operator, ok := exprMap["operator"].(string)
			if !ok {
				continue
			}
			switch operator {
			case "In", "NotIn":
				if values, ok := exprMap["values"].([]interface{}); ok {
					var valueStrs []string
					for _, val := range values {
						if valStr, ok := val.(string); ok {
							valueStrs = append(valueStrs, valStr)
						}
					}
					if len(valueStrs) > 0 {
						if operator == "In" {
							expressions = append(expressions, key+" in ("+valueStrs[0]+")")
						} else {
							expressions = append(expressions, key+" notin ("+valueStrs[0]+")")
						}
					}
				}
			case "Exists":
				expressions = append(expressions, key)
			case "DoesNotExist":
				expressions = append(expressions, "!"+key)
			}
		}
		if len(expressions) > 0 {
			result := expressions[0]
			for i := 1; i < len(expressions); i++ {
				result += "," + expressions[i]
			}
			return result
		}
	}

	return ""
}

// filterPodsByOwner filters pod items by owner reference matching the given name and kind
func filterPodsByOwner(podItems []unstructured.Unstructured, ownerName string, expectedKind string) []interface{} {
	items := make([]interface{}, 0)
	for _, item := range podItems {
		podObj := item.Object
		metadata, ok := podObj["metadata"].(map[string]interface{})
		if !ok {
			continue
		}
		ownerRefs, ok := metadata["ownerReferences"].([]interface{})
		if !ok {
			continue
		}
		for _, ownerRef := range ownerRefs {
			owner, ok := ownerRef.(map[string]interface{})
			if !ok {
				continue
			}
			refName, _ := owner["name"].(string)
			kind, _ := owner["kind"].(string)
			if refName == ownerName && kind == expectedKind {
				items = append(items, podObj)
				break
			}
		}
	}
	return items
}

// ListWorkloads returns a list of workloads by type
func ListWorkloads(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	workloads, err := GetDynamicClient().Resource(info.GVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Error("Failed to list workloads",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	response.Success(c, workloads)
}

var kruiseWorkloadGVRs = []schema.GroupVersionResource{
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "clonesets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "statefulsets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "daemonsets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "broadcastjobs"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "advancedcronjobs"},
}

// ListAllWorkloads lists all Kruise workload resources in a namespace
func ListAllWorkloads(c *gin.Context) {
	namespace := c.Param("namespace")
	results := make(map[string][]interface{})

	type result struct {
		resource string
		data     []interface{}
		err      error
	}

	resultChan := make(chan result, len(kruiseWorkloadGVRs))

	for _, gvr := range kruiseWorkloadGVRs {
		go func(gvr schema.GroupVersionResource) {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			list, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				resultChan <- result{
					resource: gvr.Resource,
					data:     []interface{}{map[string]interface{}{"error": err.Error()}},
					err:      err,
				}
				return
			}

			items := make([]interface{}, 0, len(list.Items))
			for _, item := range list.Items {
				items = append(items, item.Object)
			}

			resultChan <- result{
				resource: gvr.Resource,
				data:     items,
				err:      nil,
			}
		}(gvr)
	}

	for i := 0; i < len(kruiseWorkloadGVRs); i++ {
		select {
		case res := <-resultChan:
			results[res.resource] = res.data
		case <-time.After(15 * time.Second):
			response.Success(c, results)
			return
		}
	}

	response.Success(c, results)
}

// ScaleWorkload scales a workload to the specified number of replicas
func ScaleWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	replicasStr := c.Query("replicas")
	if replicasStr == "" {
		response.BadRequest(c, "replicas parameter is required")
		return
	}

	replicas, err := strconv.Atoi(replicasStr)
	if err != nil || replicas < 0 {
		response.BadRequest(c, "replicas must be a non-negative integer")
		return
	}

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !info.Scalable {
		response.BadRequest(c, fmt.Sprintf("%s cannot be scaled", workloadType))
		return
	}

	patchBytes := []byte(fmt.Sprintf(`{"spec":{"replicas":%d}}`, replicas))
	_, err = GetDynamicClient().Resource(info.GVR).Namespace(namespace).Patch(context.TODO(), name, types.MergePatchType, patchBytes, metav1.PatchOptions{}, "scale")
	if err != nil {
		logger.Log.Error("Failed to scale workload",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Int("replicas", replicas),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	logger.Log.Info("Successfully scaled workload",
		zap.String("namespace", namespace),
		zap.String("type", workloadType),
		zap.String("name", name),
		zap.Int("replicas", replicas),
	)

	response.Success(c, gin.H{
		"message":  fmt.Sprintf("Successfully scaled %s %s to %d replicas", workloadType, name, replicas),
		"replicas": replicas,
	})
}

// RestartWorkload restarts a workload by adding an annotation
func RestartWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !info.Restartable {
		response.BadRequest(c, fmt.Sprintf("%s cannot be restarted", workloadType))
		return
	}

	workload, err := GetDynamicClient().Resource(info.GVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get workload for restart",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	// Add restart annotation on the pod template metadata to trigger rollout
	workloadObj := workload.Object
	var spec map[string]interface{}
	if s, ok := workloadObj["spec"].(map[string]interface{}); ok {
		spec = s
	} else {
		spec = map[string]interface{}{}
		workloadObj["spec"] = spec
	}

	var template map[string]interface{}
	if t, ok := spec["template"].(map[string]interface{}); ok {
		template = t
	} else {
		template = map[string]interface{}{}
		spec["template"] = template
	}

	var tplMeta map[string]interface{}
	if m, ok := template["metadata"].(map[string]interface{}); ok {
		tplMeta = m
	} else {
		tplMeta = map[string]interface{}{}
		template["metadata"] = tplMeta
	}

	if annotations, ok := tplMeta["annotations"].(map[string]interface{}); ok {
		annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
	} else {
		tplMeta["annotations"] = map[string]interface{}{
			"kubectl.kubernetes.io/restartedAt": time.Now().Format(time.RFC3339),
		}
	}

	_, err = GetDynamicClient().Resource(info.GVR).Namespace(namespace).Update(context.TODO(), workload, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to restart workload",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	logger.Log.Info("Successfully restarted workload",
		zap.String("namespace", namespace),
		zap.String("type", workloadType),
		zap.String("name", name),
	)

	response.Success(c, gin.H{
		"message": fmt.Sprintf("Successfully restarted %s %s", workloadType, name),
	})
}

// DeleteWorkload deletes a workload
func DeleteWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	info, err := ResolveWorkloadType(workloadType)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	err = GetDynamicClient().Resource(info.GVR).Namespace(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{})
	if err != nil {
		logger.Log.Error("Failed to delete workload",
			zap.String("namespace", namespace),
			zap.String("type", workloadType),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	logger.Log.Info("Successfully deleted workload",
		zap.String("namespace", namespace),
		zap.String("type", workloadType),
		zap.String("name", name),
	)

	response.Success(c, gin.H{
		"message": fmt.Sprintf("Successfully deleted %s %s", workloadType, name),
	})
}
