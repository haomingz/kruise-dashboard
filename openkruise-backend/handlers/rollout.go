package handlers

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/response"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	rolloutAPIGroup           = "rollouts.kruise.io"
	rolloutResource           = "rollouts"
	rolloutAPIVersionV1beta1  = "v1beta1"
	rolloutAPIVersionV1alpha1 = "v1alpha1"
)

var rolloutGVR = schema.GroupVersionResource{
	Group:    rolloutAPIGroup,
	Version:  rolloutAPIVersionV1beta1,
	Resource: rolloutResource,
}

func rolloutGVRForVersion(version string) schema.GroupVersionResource {
	return schema.GroupVersionResource{
		Group:    rolloutAPIGroup,
		Version:  version,
		Resource: rolloutResource,
	}
}

// GetRollout returns the complete rollout object
func GetRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	response.Success(c, rollout.Object)
}

// GetRolloutStatus returns the current status of a rollout
func GetRolloutStatus(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout status",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	response.Success(c, rollout.Object)
}

// GetRolloutHistory returns the revision history of a rollout
func GetRolloutHistory(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for history",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	status, found, _ := unstructured.NestedMap(rollout.Object, "status")
	if !found {
		response.Success(c, gin.H{"history": nil})
		return
	}
	history, found, _ := unstructured.NestedSlice(status, "history")
	if !found {
		response.Success(c, gin.H{"history": nil})
		return
	}
	response.Success(c, history)
}

// PauseRollout sets the .spec.paused field to true
func PauseRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for pause",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	if err := unstructured.SetNestedField(rollout.Object, true, "spec", "paused"); err != nil {
		logger.Log.Error("Failed to set paused field",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for pause",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout paused successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout paused successfully"})
}

// ResumeRollout sets the .spec.paused field to false
func ResumeRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for resume",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	if err := unstructured.SetNestedField(rollout.Object, false, "spec", "paused"); err != nil {
		logger.Log.Error("Failed to unset paused field",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for resume",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout resumed successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout resumed successfully"})
}

// UndoRollout is a placeholder (real logic would require more context, e.g. revision history)
func UndoRollout(c *gin.Context) {
	response.Error(c, http.StatusNotImplemented, "Undo not implemented. Use CLI for advanced operations.", nil, "NOT_IMPLEMENTED")
}

// RestartRollout adds a restart annotation
func RestartRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for restart",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	annotations, found, _ := unstructured.NestedStringMap(rollout.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise.io/restart"] = time.Now().Format(time.RFC3339)
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		logger.Log.Error("Failed to set restart annotation",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for restart",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout restarted successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout restarted successfully"})
}

// ApproveRollout adds an approval annotation
func ApproveRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for approval",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	annotations, found, _ := unstructured.NestedStringMap(rollout.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise.io/approved"] = "true"
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		logger.Log.Error("Failed to set approval annotation",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for approval",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout approved successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout approved successfully"})
}

// resolveWorkloadRefGVR maps a workloadRef kind to its GVR.
func resolveWorkloadRefGVR(kind string) (schema.GroupVersionResource, string, error) {
	kindLower := strings.ToLower(kind)
	// Try the workload type registry first
	if info, err := ResolveWorkloadType(kindLower); err == nil {
		return info.GVR, info.Kind, nil
	}
	// Fallback for built-in workload kinds.
	switch kindLower {
	case "deployment":
		return schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}, "Deployment", nil
	case "replicaset":
		return schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "replicasets"}, "ReplicaSet", nil
	}
	return schema.GroupVersionResource{}, "", fmt.Errorf("unsupported workloadRef kind: %s", kind)
}

// extractContainers extracts container info from a workload's pod template spec
func extractContainers(obj map[string]interface{}) []map[string]interface{} {
	spec, _ := obj["spec"].(map[string]interface{})
	if spec == nil {
		return nil
	}
	template, _ := spec["template"].(map[string]interface{})
	if template == nil {
		return nil
	}
	templateSpec, _ := template["spec"].(map[string]interface{})
	if templateSpec == nil {
		return nil
	}
	containers, _ := templateSpec["containers"].([]interface{})
	result := make([]map[string]interface{}, 0, len(containers))
	for _, c := range containers {
		cMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		result = append(result, map[string]interface{}{
			"name":  cMap["name"],
			"image": cMap["image"],
		})
	}
	return result
}

// getOwnerName returns the name of the first owner reference matching the given kind
func getOwnerName(pod map[string]interface{}, kind string) string {
	metadata, _ := pod["metadata"].(map[string]interface{})
	if metadata == nil {
		return ""
	}
	refs, _ := metadata["ownerReferences"].([]interface{})
	for _, ref := range refs {
		refMap, _ := ref.(map[string]interface{})
		if refMap == nil {
			continue
		}
		if refMap["kind"] == kind {
			name, _ := refMap["name"].(string)
			return name
		}
	}
	return ""
}

// parseRevisionNumber parses a revision string for numeric sorting.
func parseRevisionNumber(revision string) int {
	n, err := strconv.Atoi(revision)
	if err != nil {
		return -1
	}
	return n
}

// isPodReady checks whether a pod is Ready based on condition/status.
func isPodReady(pod map[string]interface{}) bool {
	conditions, found, _ := unstructured.NestedSlice(pod, "status", "conditions")
	if found {
		for _, raw := range conditions {
			condition, _ := raw.(map[string]interface{})
			if condition == nil {
				continue
			}
			conditionType, _ := condition["type"].(string)
			conditionStatus, _ := condition["status"].(string)
			if conditionType == "Ready" && conditionStatus == "True" {
				return true
			}
		}
	}

	phase, _, _ := unstructured.NestedString(pod, "status", "phase")
	return phase == "Running" || phase == "Succeeded"
}

func listReplicaSetsBySelector(namespace, labelSelector string) ([]unstructured.Unstructured, error) {
	rsGVR := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "replicasets"}
	rsList, err := GetDynamicClient().Resource(rsGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, err
	}
	return rsList.Items, nil
}

func isReplicaSetOwnedByDeployment(rs unstructured.Unstructured, workloadName, workloadUID string) bool {
	owners, _, _ := unstructured.NestedSlice(rs.Object, "metadata", "ownerReferences")
	for _, ownerRaw := range owners {
		owner, _ := ownerRaw.(map[string]interface{})
		if owner == nil {
			continue
		}
		ownerUID, _ := owner["uid"].(string)
		ownerName, _ := owner["name"].(string)
		ownerKind, _ := owner["kind"].(string)
		if ownerUID != "" && ownerUID == workloadUID {
			return true
		}
		if ownerKind == "Deployment" && ownerName == workloadName {
			return true
		}
	}
	return false
}

func matchReplicaSetsForDeployment(replicaSets []unstructured.Unstructured, workload *unstructured.Unstructured) []unstructured.Unstructured {
	workloadName, _, _ := unstructured.NestedString(workload.Object, "metadata", "name")
	workloadUID, _, _ := unstructured.NestedString(workload.Object, "metadata", "uid")

	matched := make([]unstructured.Unstructured, 0, len(replicaSets))
	for _, rs := range replicaSets {
		if isReplicaSetOwnedByDeployment(rs, workloadName, workloadUID) {
			matched = append(matched, rs)
		}
	}
	return matched
}

func groupPodsByOwnerKind(pods []unstructured.Unstructured, ownerKind string) map[string][]interface{} {
	grouped := map[string][]interface{}{}
	for _, pod := range pods {
		ownerName := getOwnerName(pod.Object, ownerKind)
		if ownerName == "" {
			continue
		}
		grouped[ownerName] = append(grouped[ownerName], pod.Object)
	}
	return grouped
}

func toDeploymentRevisionMap(
	rs unstructured.Unstructured,
	podsByRS map[string][]interface{},
	stableRevision string,
	canaryRevision string,
) map[string]interface{} {
	rsName, _, _ := unstructured.NestedString(rs.Object, "metadata", "name")
	annotations, _, _ := unstructured.NestedStringMap(rs.Object, "metadata", "annotations")
	revision := annotations["deployment.kubernetes.io/revision"]
	labels, _, _ := unstructured.NestedStringMap(rs.Object, "metadata", "labels")
	podTemplateHash := labels["pod-template-hash"]

	replicas, _, _ := unstructured.NestedInt64(rs.Object, "spec", "replicas")
	readyReplicas, _, _ := unstructured.NestedInt64(rs.Object, "status", "readyReplicas")
	isStable := podTemplateHash != "" && podTemplateHash == stableRevision
	isCanary := podTemplateHash != "" && podTemplateHash == canaryRevision

	return map[string]interface{}{
		"name":            rsName,
		"revision":        revision,
		"podTemplateHash": podTemplateHash,
		"isStable":        isStable,
		"isCanary":        isCanary,
		"replicas":        replicas,
		"readyReplicas":   readyReplicas,
		"pods":            podsByRS[rsName],
		"containers":      extractContainers(rs.Object),
	}
}

func sortDeploymentRevisions(revisions []map[string]interface{}) {
	sort.Slice(revisions, func(i, j int) bool {
		iCanary, _ := revisions[i]["isCanary"].(bool)
		jCanary, _ := revisions[j]["isCanary"].(bool)
		if iCanary != jCanary {
			return iCanary
		}
		iStable, _ := revisions[i]["isStable"].(bool)
		jStable, _ := revisions[j]["isStable"].(bool)
		if iStable != jStable {
			return iStable
		}
		iRev, _ := revisions[i]["revision"].(string)
		jRev, _ := revisions[j]["revision"].(string)
		iRevNum := parseRevisionNumber(iRev)
		jRevNum := parseRevisionNumber(jRev)
		if iRevNum != jRevNum {
			return iRevNum > jRevNum
		}
		return iRev > jRev
	})
}

// buildRevisionsForDeployment lists ReplicaSets for a Deployment and groups pods by RS.
func buildRevisionsForDeployment(namespace string, workload *unstructured.Unstructured, pods []unstructured.Unstructured, stableRevision, canaryRevision string) []map[string]interface{} {
	labelSelector := extractLabelSelector(workload.Object)
	if labelSelector == "" {
		return nil
	}

	replicaSets, err := listReplicaSetsBySelector(namespace, labelSelector)
	if err != nil {
		logger.Log.Warn("Failed to list ReplicaSets", zap.Error(err))
		return nil
	}

	matchedReplicaSets := matchReplicaSetsForDeployment(replicaSets, workload)
	podsByRS := groupPodsByOwnerKind(pods, "ReplicaSet")

	revisions := make([]map[string]interface{}, 0, len(matchedReplicaSets))
	for _, rs := range matchedReplicaSets {
		revisions = append(revisions, toDeploymentRevisionMap(rs, podsByRS, stableRevision, canaryRevision))
	}

	sortDeploymentRevisions(revisions)
	return revisions
}

// buildRevisionsForNonDeployment groups pods by controller-revision-hash for CloneSet/StatefulSet
func buildRevisionsForNonDeployment(pods []unstructured.Unstructured, stableRevision, canaryRevision string) []map[string]interface{} {
	groups := map[string][]interface{}{}
	for _, pod := range pods {
		labels, _, _ := unstructured.NestedStringMap(pod.Object, "metadata", "labels")
		hash := labels["controller-revision-hash"]
		if hash == "" {
			hash = "unknown"
		}
		groups[hash] = append(groups[hash], pod.Object)
	}

	revisions := make([]map[string]interface{}, 0, len(groups))
	for hash, podList := range groups {
		isStable := hash == stableRevision
		isCanary := hash == canaryRevision
		readyReplicas := int64(0)
		for _, raw := range podList {
			podObj, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if isPodReady(podObj) {
				readyReplicas++
			}
		}
		revisions = append(revisions, map[string]interface{}{
			"name":            hash,
			"revision":        "",
			"podTemplateHash": hash,
			"isStable":        isStable,
			"isCanary":        isCanary,
			"replicas":        int64(len(podList)),
			"readyReplicas":   readyReplicas,
			"pods":            podList,
			"containers":      nil,
		})
	}

	sort.Slice(revisions, func(i, j int) bool {
		iCanary, _ := revisions[i]["isCanary"].(bool)
		jCanary, _ := revisions[j]["isCanary"].(bool)
		if iCanary != jCanary {
			return iCanary
		}
		iStable, _ := revisions[i]["isStable"].(bool)
		jStable, _ := revisions[j]["isStable"].(bool)
		return iStable && !jStable
	})

	return revisions
}

func extractWorkloadRefFromRollout(rollout *unstructured.Unstructured) map[string]interface{} {
	spec, _, _ := unstructured.NestedMap(rollout.Object, "spec")
	workloadRef, _, _ := unstructured.NestedMap(spec, "workloadRef")
	if workloadRef != nil {
		return workloadRef
	}
	workloadRef, _, _ = unstructured.NestedMap(spec, "objectRef", "workloadRef")
	return workloadRef
}

func extractCanaryRevisions(rollout *unstructured.Unstructured) (string, string) {
	stableRevision, _, _ := unstructured.NestedString(rollout.Object, "status", "canaryStatus", "stableRevision")
	canaryRevision, _, _ := unstructured.NestedString(rollout.Object, "status", "canaryStatus", "canaryRevision")
	if canaryRevision == "" {
		canaryRevision, _, _ = unstructured.NestedString(rollout.Object, "status", "canaryStatus", "podTemplateHash")
	}
	return stableRevision, canaryRevision
}

func podsToObjects(pods []unstructured.Unstructured) []interface{} {
	items := make([]interface{}, 0, len(pods))
	for _, item := range pods {
		items = append(items, item.Object)
	}
	return items
}

func listPodsBySelector(namespace, labelSelector string) ([]unstructured.Unstructured, []interface{}, error) {
	podGVR := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "pods"}
	pods, err := GetDynamicClient().Resource(podGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, nil, err
	}
	return pods.Items, podsToObjects(pods.Items), nil
}

func listFallbackPodsByApp(namespace, workloadName string) ([]interface{}, error) {
	_, items, err := listPodsBySelector(namespace, "app="+workloadName)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func getWorkloadPodsWithFallback(
	namespace string,
	refKind string,
	refName string,
) (*unstructured.Unstructured, []unstructured.Unstructured, []interface{}, bool, error) {
	workloadGVR, _, err := resolveWorkloadRefGVR(refKind)
	if err != nil {
		logger.Log.Warn("Cannot resolve workloadRef GVR, falling back to label-based pod lookup",
			zap.String("kind", refKind),
			zap.Error(err),
		)
		items, listErr := listFallbackPodsByApp(namespace, refName)
		if listErr != nil {
			return nil, nil, nil, true, listErr
		}
		return nil, nil, items, true, nil
	}

	workload, err := GetDynamicClient().Resource(workloadGVR).Namespace(namespace).Get(context.TODO(), refName, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get workload for rollout pods",
			zap.String("namespace", namespace),
			zap.String("workload", refName),
			zap.String("kind", refKind),
			zap.Error(err),
		)
		return nil, nil, nil, false, err
	}

	labelSelector := extractLabelSelector(workload.Object)
	if labelSelector == "" {
		labelSelector = "app=" + refName
	}

	pods, items, err := listPodsBySelector(namespace, labelSelector)
	if err != nil {
		logger.Log.Error("Failed to list pods for rollout",
			zap.String("namespace", namespace),
			zap.String("labelSelector", labelSelector),
			zap.Error(err),
		)
		return nil, nil, nil, false, err
	}

	return workload, pods, items, false, nil
}

func buildRevisionsForWorkload(
	refKind string,
	namespace string,
	workload *unstructured.Unstructured,
	pods []unstructured.Unstructured,
	stableRevision string,
	canaryRevision string,
) []map[string]interface{} {
	if strings.EqualFold(refKind, "deployment") {
		return buildRevisionsForDeployment(namespace, workload, pods, stableRevision, canaryRevision)
	}
	return buildRevisionsForNonDeployment(pods, stableRevision, canaryRevision)
}

// GetRolloutPods returns pods related to a rollout's referenced workload, with revision grouping
func GetRolloutPods(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// 1. Get rollout object
	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for pods",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	// 2. Extract spec.workloadRef
	workloadRef := extractWorkloadRefFromRollout(rollout)
	if workloadRef == nil {
		response.Success(c, gin.H{
			"pods":        []interface{}{},
			"workloadRef": nil,
		})
		return
	}

	refKind, _ := workloadRef["kind"].(string)
	refName, _ := workloadRef["name"].(string)

	if refKind == "" || refName == "" {
		response.Success(c, gin.H{
			"pods":        []interface{}{},
			"workloadRef": workloadRef,
		})
		return
	}

	// 3. Extract stable/canary revision info from rollout status
	stableRevision, canaryRevision := extractCanaryRevisions(rollout)

	// 4. Resolve workload + list pods (with fallback on unresolved kind)
	workload, pods, items, usedFallback, err := getWorkloadPodsWithFallback(namespace, refKind, refName)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	if usedFallback {
		response.Success(c, gin.H{
			"pods":        items,
			"workloadRef": workloadRef,
		})
		return
	}

	// 5. Build revision groups
	revisions := buildRevisionsForWorkload(refKind, namespace, workload, pods, stableRevision, canaryRevision)

	// 6. Extract containers from workload
	containers := extractContainers(workload.Object)

	response.Success(c, gin.H{
		"pods":        items,
		"workloadRef": workloadRef,
		"revisions":   revisions,
		"containers":  containers,
	})
}

// AbortRollout disables the rollout by setting spec.disabled = true
func AbortRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for abort",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	if err := unstructured.SetNestedField(rollout.Object, true, "spec", "disabled"); err != nil {
		logger.Log.Error("Failed to set disabled field",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for abort",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout aborted successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout aborted successfully"})
}

// RetryRollout retries a rollout by unpausing and adding a retry annotation
func RetryRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for retry",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	// Unpause the rollout
	if err := unstructured.SetNestedField(rollout.Object, false, "spec", "paused"); err != nil {
		logger.Log.Error("Failed to unset paused field for retry",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	// Add a retry annotation to trigger re-evaluation
	annotations, found, _ := unstructured.NestedStringMap(rollout.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise.io/retry"] = time.Now().Format(time.RFC3339)
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		logger.Log.Error("Failed to set retry annotation",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		logger.Log.Error("Failed to update rollout for retry",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	logger.Log.Info("Rollout retried successfully",
		zap.String("namespace", namespace),
		zap.String("name", name),
	)
	response.Success(c, gin.H{"message": "Rollout retried successfully"})
}

// ListAllRollouts lists all rollouts in a namespace
func ListAllRollouts(c *gin.Context) {
	namespace := c.Param("namespace")

	allItems := []interface{}{}

	v1beta1GVR := rolloutGVRForVersion(rolloutAPIVersionV1beta1)
	v1beta1List, err := GetDynamicClient().Resource(v1beta1GVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err == nil {
		for _, item := range v1beta1List.Items {
			allItems = append(allItems, item.Object)
		}
	}

	if len(allItems) == 0 && v1beta1List == nil {
		logger.Log.Error("Failed to list rollouts",
			zap.String("namespace", namespace),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{
		"rollouts":  allItems,
		"total":     len(allItems),
		"namespace": namespace,
	})
}

// ListActiveRollouts lists only active rollouts in a namespace
func ListActiveRollouts(c *gin.Context) {
	namespace := c.Param("namespace")
	active := []interface{}{}
	gvr := rolloutGVRForVersion(rolloutAPIVersionV1beta1)
	list, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Log.Error("Failed to list active rollouts",
			zap.String("namespace", namespace),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}
	for _, item := range list.Items {
		status, found, _ := unstructured.NestedMap(item.Object, "status")
		if !found {
			continue
		}
		phase, _, _ := unstructured.NestedString(status, "phase")
		if phase != "Completed" && phase != "" {
			active = append(active, item.Object)
		}
	}
	response.Success(c, active)
}

func ListDefaultRollouts(c *gin.Context) {
	allItems := []interface{}{}

	v1beta1GVR := rolloutGVRForVersion(rolloutAPIVersionV1beta1)
	v1beta1List, err := GetDynamicClient().Resource(v1beta1GVR).Namespace("default").List(context.TODO(), metav1.ListOptions{})
	if err == nil {
		for _, item := range v1beta1List.Items {
			allItems = append(allItems, item.Object)
		}
	}

	v1alpha1GVR := rolloutGVRForVersion(rolloutAPIVersionV1alpha1)
	v1alpha1List, err := GetDynamicClient().Resource(v1alpha1GVR).Namespace("default").List(context.TODO(), metav1.ListOptions{})
	if err == nil {
		for _, item := range v1alpha1List.Items {
			allItems = append(allItems, item.Object)
		}
	}

	if len(allItems) == 0 && v1beta1List == nil && v1alpha1List == nil {
		logger.Log.Error("Failed to list rollouts in default namespace")
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{
		"rollouts":    allItems,
		"total":       len(allItems),
		"namespace":   "default",
		"apiVersions": []string{"v1beta1", "v1alpha1"},
	})
}
