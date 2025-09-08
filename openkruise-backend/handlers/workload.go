package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// GetWorkload returns a specific workload by type and name
func GetWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		}
	case "daemonset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "daemonsets",
		}
	case "broadcastjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "broadcastjobs",
		}
	case "advancedcronjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "advancedcronjobs",
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	workload, err := GetDynamicClient().Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, workload)
}

// GetWorkloadPods returns pods related to a specific workload
func GetWorkloadPods(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	// Get the workload first to extract its selector labels
	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1beta1",
			Resource: "statefulsets",
		}
	case "daemonset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "daemonsets",
		}
	case "broadcastjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "broadcastjobs",
		}
	case "advancedcronjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "advancedcronjobs",
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	workload, err := GetDynamicClient().Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Extract selector labels from the workload
	var labelSelector string
	workloadObj := workload.Object

	if spec, ok := workloadObj["spec"].(map[string]interface{}); ok {
		if selector, ok := spec["selector"].(map[string]interface{}); ok {
			// Handle matchLabels
			if matchLabels, ok := selector["matchLabels"].(map[string]interface{}); ok {
				var labels []string
				for key, value := range matchLabels {
					if valueStr, ok := value.(string); ok {
						labels = append(labels, key+"="+valueStr)
					}
				}
				if len(labels) > 0 {
					labelSelector = labels[0]
					for i := 1; i < len(labels); i++ {
						labelSelector += "," + labels[i]
					}
				}
			}

			// Handle matchExpressions if matchLabels is empty
			if labelSelector == "" {
				if matchExpressions, ok := selector["matchExpressions"].([]interface{}); ok {
					var expressions []string
					for _, expr := range matchExpressions {
						if exprMap, ok := expr.(map[string]interface{}); ok {
							if key, ok := exprMap["key"].(string); ok {
								if operator, ok := exprMap["operator"].(string); ok {
									if operator == "In" || operator == "NotIn" {
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
									} else if operator == "Exists" {
										expressions = append(expressions, key)
									} else if operator == "DoesNotExist" {
										expressions = append(expressions, "!"+key)
									}
								}
							}
						}
					}
					if len(expressions) > 0 {
						labelSelector = expressions[0]
						for i := 1; i < len(expressions); i++ {
							labelSelector += "," + expressions[i]
						}
					}
				}
			}
		}
	}

	// If no selector found, use a more specific fallback based on workload type and name
	if labelSelector == "" {
		// Use workload-specific label selectors
		switch workloadType {
		case "deployment":
			labelSelector = "app=" + name + ",deployment=" + name
		case "cloneset":
			labelSelector = "app=" + name + ",cloneset=" + name
		case "statefulset":
			labelSelector = "app=" + name + ",statefulset=" + name
		case "daemonset":
			labelSelector = "app=" + name + ",daemonset=" + name
		case "broadcastjob":
			labelSelector = "app=" + name + ",broadcastjob=" + name
		case "advancedcronjob":
			labelSelector = "app=" + name + ",advancedcronjob=" + name
		default:
			labelSelector = "app=" + name
		}
	}

	// Get pods using the label selector
	podGVR := schema.GroupVersionResource{
		Group:    "",
		Version:  "v1",
		Resource: "pods",
	}

	pods, err := GetDynamicClient().Resource(podGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Extract pod items and filter by owner reference
	items := make([]interface{}, 0)
	for _, item := range pods.Items {
		podObj := item.Object

		// Check if this pod is owned by the specific workload
		if metadata, ok := podObj["metadata"].(map[string]interface{}); ok {
			if ownerRefs, ok := metadata["ownerReferences"].([]interface{}); ok {
				for _, ownerRef := range ownerRefs {
					if owner, ok := ownerRef.(map[string]interface{}); ok {
						if ownerName, ok := owner["name"].(string); ok {
							if ownerName == name {
								// Check if the owner kind matches the workload type
								if ownerKind, ok := owner["kind"].(string); ok {
									expectedKind := ""
									switch workloadType {
									case "deployment":
										expectedKind = "Deployment"
									case "cloneset":
										expectedKind = "CloneSet"
									case "statefulset":
										expectedKind = "StatefulSet"
									case "daemonset":
										expectedKind = "DaemonSet"
									case "broadcastjob":
										expectedKind = "BroadcastJob"
									case "advancedcronjob":
										expectedKind = "AdvancedCronJob"
									}

									if ownerKind == expectedKind {
										items = append(items, podObj)
										break
									}
								}
							}
						}
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"workload": workload.Object,
		"pods":     items,
	})
}

// ListWorkloads returns a list of workloads by type
func ListWorkloads(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")

	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		}
	case "daemonset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "daemonsets",
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	workloads, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, workloads)
}

var kruiseWorkloadGVRs = []schema.GroupVersionResource{
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "clonesets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "statefulsets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "daemonsets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "broadcastjobs"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "containerrecreaterequests"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "advancedcronjobs"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "resourcedistributions"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "uniteddeployments"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "sidecarsets"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "podprobemarkers"},
	// {Group: "apps.kruise.io", Version: "v1alpha1", Resource: "imagepulljobs"},
	// {Group: "policy.kruise.io", Version: "v1alpha1", Resource: "podunavailablebudgets"},
}

// ListAllWorkloads lists all Kruise workload resources in a namespace
func ListAllWorkloads(c *gin.Context) {
	namespace := c.Param("namespace")
	results := make(map[string][]interface{})

	// Use a channel to collect results from goroutines
	type result struct {
		resource string
		data     []interface{}
		err      error
	}

	resultChan := make(chan result, len(kruiseWorkloadGVRs))

	// Process each workload type concurrently
	for _, gvr := range kruiseWorkloadGVRs {
		go func(gvr schema.GroupVersionResource) {
			// Create a context with timeout for each request
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

	// Collect all results
	for i := 0; i < len(kruiseWorkloadGVRs); i++ {
		select {
		case res := <-resultChan:
			results[res.resource] = res.data
		case <-time.After(15 * time.Second): // Overall timeout
			c.JSON(http.StatusOK, results)
			return
		}
	}

	c.JSON(http.StatusOK, results)
}

// ScaleWorkload scales a workload to the specified number of replicas
func ScaleWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	// Parse replicas from query parameter
	replicasStr := c.Query("replicas")
	if replicasStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "replicas parameter is required"})
		return
	}

	replicas, err := strconv.Atoi(replicasStr)
	if err != nil || replicas < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "replicas must be a non-negative integer"})
		return
	}

	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		}
	case "daemonset":
		c.JSON(http.StatusBadRequest, gin.H{"error": "DaemonSet cannot be scaled"})
		return
	case "broadcastjob":
		c.JSON(http.StatusBadRequest, gin.H{"error": "BroadcastJob cannot be scaled"})
		return
	case "advancedcronjob":
		c.JSON(http.StatusBadRequest, gin.H{"error": "AdvancedCronJob cannot be scaled"})
		return
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	// Get the current workload
	workload, err := GetDynamicClient().Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create a patch to update replicas
	workloadObj := workload.Object
	if spec, ok := workloadObj["spec"].(map[string]interface{}); ok {
		spec["replicas"] = int32(replicas)
	}

	// Apply the update
	_, err = GetDynamicClient().Resource(gvr).Namespace(namespace).Update(context.TODO(), workload, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("Successfully scaled %s %s to %d replicas", workloadType, name, replicas),
		"replicas": replicas,
	})
}

// RestartWorkload restarts a workload by adding an annotation
func RestartWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		}
	case "daemonset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "daemonsets",
		}
	case "broadcastjob":
		c.JSON(http.StatusBadRequest, gin.H{"error": "BroadcastJob cannot be restarted"})
		return
	case "advancedcronjob":
		c.JSON(http.StatusBadRequest, gin.H{"error": "AdvancedCronJob cannot be restarted"})
		return
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	// Get the current workload
	workload, err := GetDynamicClient().Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Add restart annotation
	workloadObj := workload.Object
	if metadata, ok := workloadObj["metadata"].(map[string]interface{}); ok {
		if annotations, ok := metadata["annotations"].(map[string]interface{}); ok {
			annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
		} else {
			metadata["annotations"] = map[string]interface{}{
				"kubectl.kubernetes.io/restartedAt": time.Now().Format(time.RFC3339),
			}
		}
	}

	// Apply the update
	_, err = GetDynamicClient().Resource(gvr).Namespace(namespace).Update(context.TODO(), workload, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully restarted %s %s", workloadType, name),
	})
}

// DeleteWorkload deletes a workload
func DeleteWorkload(c *gin.Context) {
	namespace := c.Param("namespace")
	workloadType := c.Param("type")
	name := c.Param("name")

	var gvr schema.GroupVersionResource
	switch workloadType {
	case "deployment":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "deployments",
		}
	case "cloneset":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "clonesets",
		}
	case "statefulset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "statefulsets",
		}
	case "daemonset":
		gvr = schema.GroupVersionResource{
			Group:    "apps",
			Version:  "v1",
			Resource: "daemonsets",
		}
	case "broadcastjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "broadcastjobs",
		}
	case "advancedcronjob":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kruise.io",
			Version:  "v1alpha1",
			Resource: "advancedcronjobs",
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported workload type"})
		return
	}

	// Delete the workload
	err := GetDynamicClient().Resource(gvr).Namespace(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully deleted %s %s", workloadType, name),
	})
}
