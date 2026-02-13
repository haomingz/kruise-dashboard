package handlers

import (
	"context"
	"encoding/json"
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
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
)

const (
	rolloutAPIGroup           = "rollouts.kruise.io"
	rolloutResource           = "rollouts"
	rolloutAPIVersionV1beta1  = "v1beta1"
	rolloutAPIVersionV1alpha1 = "v1alpha1"

	watchEventUpsert    = "upsert"
	watchEventDelete    = "delete"
	watchEventSnapshot  = "snapshot"
	watchEventError     = "error"
	watchEventHeartbeat = "heartbeat"

	watchResourceType = "rollout"

	errorCodeUnsupportedRollbackKind = "UNSUPPORTED_ROLLBACK_KIND"
	errorCodeWatchStreamUnavailable  = "WATCH_STREAM_UNAVAILABLE"
	errorCodeAnalysisNotConfigured   = "ANALYSIS_SOURCE_NOT_CONFIGURED"
	errorCodeRolloutNotPromotable    = "ROLLOUT_NOT_PROMOTABLE"

	rolloutHeartbeatInterval = 20 * time.Second
)

var rolloutGVR = schema.GroupVersionResource{
	Group:    rolloutAPIGroup,
	Version:  rolloutAPIVersionV1beta1,
	Resource: rolloutResource,
}

var deploymentGVR = schema.GroupVersionResource{
	Group:    "apps",
	Version:  "v1",
	Resource: "deployments",
}

var replicaSetGVR = schema.GroupVersionResource{
	Group:    "apps",
	Version:  "v1",
	Resource: "replicasets",
}

func rolloutGVRForVersion(version string) schema.GroupVersionResource {
	return schema.GroupVersionResource{
		Group:    rolloutAPIGroup,
		Version:  version,
		Resource: rolloutResource,
	}
}

func writeRolloutSSEEvent(c *gin.Context, eventType string, payload map[string]interface{}) bool {
	data, err := json.Marshal(payload)
	if err != nil {
		logger.Log.Error("Failed to marshal rollout watch payload", zap.Error(err))
		return false
	}

	if _, err = fmt.Fprintf(c.Writer, "event: %s\n", eventType); err != nil {
		return false
	}
	if _, err = fmt.Fprintf(c.Writer, "data: %s\n\n", data); err != nil {
		return false
	}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return false
	}
	flusher.Flush()
	return true
}

func rolloutObjectFromRuntime(obj runtime.Object) (map[string]interface{}, error) {
	switch typed := obj.(type) {
	case *unstructured.Unstructured:
		return typed.Object, nil
	default:
		return nil, fmt.Errorf("unsupported watch object type: %T", obj)
	}
}

func extractRolloutWatchMeta(rolloutObj map[string]interface{}) (string, string, string) {
	metadata, _ := rolloutObj["metadata"].(map[string]interface{})
	if metadata == nil {
		return "", "", ""
	}
	namespace, _ := metadata["namespace"].(string)
	name, _ := metadata["name"].(string)
	resourceVersion, _ := metadata["resourceVersion"].(string)
	return namespace, name, resourceVersion
}

func buildRolloutWatchPayload(
	rolloutObj map[string]interface{},
	namespaceHint string,
	nameHint string,
	resourceVersionHint string,
	errorMessage string,
) map[string]interface{} {
	namespace, name, resourceVersion := extractRolloutWatchMeta(rolloutObj)
	if namespace == "" {
		namespace = namespaceHint
	}
	if name == "" {
		name = nameHint
	}
	if resourceVersion == "" {
		resourceVersion = resourceVersionHint
	}

	payload := map[string]interface{}{
		"type":            watchResourceType,
		"namespace":       namespace,
		"name":            name,
		"resourceVersion": resourceVersion,
		"rollout":         rolloutObj,
		"ts":              time.Now().UTC().Format(time.RFC3339Nano),
	}

	if errorMessage != "" {
		payload["message"] = errorMessage
	}

	return payload
}

func streamRolloutWatch(c *gin.Context, namespace, name string) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		response.Error(c, http.StatusInternalServerError, "Streaming unsupported by server", nil, errorCodeWatchStreamUnavailable)
		return
	}

	ctx := c.Request.Context()
	listOpts := metav1.ListOptions{}
	if name != "" {
		listOpts.FieldSelector = "metadata.name=" + name
	}

	initialList, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).List(ctx, listOpts)
	if err != nil {
		logger.Log.Error("Failed to list rollouts for watch",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.Error(c, http.StatusServiceUnavailable, "Rollout watch stream unavailable", err, errorCodeWatchStreamUnavailable)
		return
	}

	listOpts.ResourceVersion = initialList.GetResourceVersion()
	watcher, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Watch(ctx, listOpts)
	if err != nil {
		logger.Log.Error("Failed to start rollout watch",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.Error(c, http.StatusServiceUnavailable, "Rollout watch stream unavailable", err, errorCodeWatchStreamUnavailable)
		return
	}
	defer watcher.Stop()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	flusher.Flush()

	for i := range initialList.Items {
		if !writeRolloutSSEEvent(c, watchEventSnapshot, buildRolloutWatchPayload(initialList.Items[i].Object, namespace, name, initialList.GetResourceVersion(), "")) {
			return
		}
	}

	heartbeatTicker := time.NewTicker(rolloutHeartbeatInterval)
	defer heartbeatTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeatTicker.C:
			if !writeRolloutSSEEvent(c, watchEventHeartbeat, buildRolloutWatchPayload(nil, namespace, name, listOpts.ResourceVersion, "")) {
				return
			}
		case event, ok := <-watcher.ResultChan():
			if !ok {
				_ = writeRolloutSSEEvent(
					c,
					watchEventError,
					buildRolloutWatchPayload(nil, namespace, name, listOpts.ResourceVersion, "watch stream closed"),
				)
				return
			}

			switch event.Type {
			case watch.Added, watch.Modified:
				obj, objErr := rolloutObjectFromRuntime(event.Object)
				if objErr != nil {
					_ = writeRolloutSSEEvent(
						c,
						watchEventError,
						buildRolloutWatchPayload(nil, namespace, name, listOpts.ResourceVersion, objErr.Error()),
					)
					continue
				}
				_, _, rv := extractRolloutWatchMeta(obj)
				if rv != "" {
					listOpts.ResourceVersion = rv
				}
				if !writeRolloutSSEEvent(c, watchEventUpsert, buildRolloutWatchPayload(obj, namespace, name, listOpts.ResourceVersion, "")) {
					return
				}
			case watch.Deleted:
				obj, objErr := rolloutObjectFromRuntime(event.Object)
				if objErr != nil {
					_ = writeRolloutSSEEvent(
						c,
						watchEventError,
						buildRolloutWatchPayload(nil, namespace, name, listOpts.ResourceVersion, objErr.Error()),
					)
					continue
				}
				_, _, rv := extractRolloutWatchMeta(obj)
				if rv != "" {
					listOpts.ResourceVersion = rv
				}
				if !writeRolloutSSEEvent(c, watchEventDelete, buildRolloutWatchPayload(obj, namespace, name, listOpts.ResourceVersion, "")) {
					return
				}
			case watch.Error:
				message := "watch error"
				if status, ok := event.Object.(*metav1.Status); ok && status.Message != "" {
					message = status.Message
				}
				if !writeRolloutSSEEvent(c, watchEventError, buildRolloutWatchPayload(nil, namespace, name, listOpts.ResourceVersion, message)) {
					return
				}
			}
		}
	}
}

// WatchRollouts streams rollout change events for a namespace via SSE.
func WatchRollouts(c *gin.Context) {
	namespace := c.Param("namespace")
	streamRolloutWatch(c, namespace, "")
}

// WatchRollout streams rollout change events for a specific rollout via SSE.
func WatchRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	streamRolloutWatch(c, namespace, name)
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

func isRolloutPromotable(rollout *unstructured.Unstructured) bool {
	phase, _, _ := unstructured.NestedString(rollout.Object, "status", "phase")
	specPaused, _, _ := unstructured.NestedBool(rollout.Object, "spec", "paused")
	return specPaused || phase == "Paused" || phase == "Progressing"
}

// PromoteRollout promotes a rollout by continuing from the current step (non-full promote).
func PromoteRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for promote",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	if !isRolloutPromotable(rollout) {
		response.Error(c, http.StatusConflict, "Rollout is not in a promotable state", nil, errorCodeRolloutNotPromotable)
		return
	}

	if err := unstructured.SetNestedField(rollout.Object, false, "spec", "paused"); err != nil {
		logger.Log.Error("Failed to unset paused field for promote",
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
	annotations["kruise.io/promote"] = time.Now().UTC().Format(time.RFC3339Nano)
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		logger.Log.Error("Failed to set promote annotation",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	if _, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{}); err != nil {
		logger.Log.Error("Failed to update rollout for promote",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Rollout promoted to next step"})
}

func findReplicaSetByStableRevision(
	namespace string,
	deployment *unstructured.Unstructured,
	stableRevision string,
) (*unstructured.Unstructured, error) {
	selector := extractLabelSelector(deployment.Object)
	if selector == "" {
		return nil, fmt.Errorf("deployment selector is empty")
	}

	rsList, err := GetDynamicClient().Resource(replicaSetGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return nil, err
	}

	workloadName, _, _ := unstructured.NestedString(deployment.Object, "metadata", "name")
	workloadUID, _, _ := unstructured.NestedString(deployment.Object, "metadata", "uid")

	for i := range rsList.Items {
		rs := rsList.Items[i]
		if !isReplicaSetOwnedByDeployment(rs, workloadName, workloadUID) {
			continue
		}

		labels, _, _ := unstructured.NestedStringMap(rs.Object, "metadata", "labels")
		podTemplateHash := labels["pod-template-hash"]
		if podTemplateHash == stableRevision {
			rsCopy := rs.DeepCopy()
			return rsCopy, nil
		}
	}

	return nil, apierrors.NewNotFound(schema.GroupResource{Group: "apps", Resource: "replicasets"}, stableRevision)
}

func rolloutDeploymentForRollback(rollout *unstructured.Unstructured) (string, string, error) {
	workloadRef := extractWorkloadRefFromRollout(rollout)
	if workloadRef == nil {
		return "", "", fmt.Errorf("workloadRef is not configured")
	}

	workloadKind, _ := workloadRef["kind"].(string)
	workloadName, _ := workloadRef["name"].(string)
	if workloadKind == "" || workloadName == "" {
		return "", "", fmt.Errorf("workloadRef is incomplete")
	}

	if !strings.EqualFold(workloadKind, "deployment") {
		return "", "", fmt.Errorf("unsupported kind: %s", workloadKind)
	}

	return "Deployment", workloadName, nil
}

// RollbackRollout rolls back a rollout to the stable revision template.
// Phase 1 supports only workloadRef.kind=Deployment.
func RollbackRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get rollout for rollback",
			zap.String("namespace", namespace),
			zap.String("name", name),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	workloadKind, workloadName, err := rolloutDeploymentForRollback(rollout)
	if err != nil {
		response.Error(c, http.StatusNotImplemented, "Current rollback only supports Deployment", err, errorCodeUnsupportedRollbackKind)
		return
	}

	stableRevision, _, _ := unstructured.NestedString(rollout.Object, "status", "canaryStatus", "stableRevision")
	if stableRevision == "" {
		response.Error(c, http.StatusConflict, "No stable revision available for rollback", nil, "STABLE_REVISION_NOT_FOUND")
		return
	}

	deployment, err := GetDynamicClient().Resource(deploymentGVR).Namespace(namespace).Get(context.TODO(), workloadName, metav1.GetOptions{})
	if err != nil {
		logger.Log.Error("Failed to get deployment for rollback",
			zap.String("namespace", namespace),
			zap.String("rollout", name),
			zap.String("deployment", workloadName),
			zap.Error(err),
		)
		response.InternalError(c, err)
		return
	}

	stableRS, err := findReplicaSetByStableRevision(namespace, deployment, stableRevision)
	if err != nil {
		if apierrors.IsNotFound(err) {
			response.Error(c, http.StatusNotFound, "Stable revision ReplicaSet not found", err, "STABLE_REPLICASET_NOT_FOUND")
			return
		}
		response.InternalError(c, err)
		return
	}

	stableTemplate, found, _ := unstructured.NestedMap(stableRS.Object, "spec", "template")
	if !found || stableTemplate == nil {
		response.Error(c, http.StatusConflict, "Stable ReplicaSet template is empty", nil, "INVALID_STABLE_TEMPLATE")
		return
	}

	templateCopy := runtime.DeepCopyJSON(stableTemplate)
	if err := unstructured.SetNestedMap(deployment.Object, templateCopy, "spec", "template"); err != nil {
		response.InternalError(c, err)
		return
	}

	annotations, found, _ := unstructured.NestedStringMap(deployment.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise-dashboard.io/rolled-back-at"] = time.Now().UTC().Format(time.RFC3339Nano)
	if err := unstructured.SetNestedStringMap(deployment.Object, annotations, "metadata", "annotations"); err != nil {
		response.InternalError(c, err)
		return
	}

	if _, err = GetDynamicClient().Resource(deploymentGVR).Namespace(namespace).Update(context.TODO(), deployment, metav1.UpdateOptions{}); err != nil {
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{
		"message":        "Rollback completed",
		"rollout":        name,
		"namespace":      namespace,
		"workloadKind":   workloadKind,
		"workloadName":   workloadName,
		"stableRevision": stableRevision,
	})
}

// GetRolloutAnalysis returns placeholder analysis information (phase 1 scaffold).
func GetRolloutAnalysis(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	_, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			response.NotFound(c, "rollout")
			return
		}
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{
		"source":  "placeholder",
		"status":  "not_configured",
		"code":    errorCodeAnalysisNotConfigured,
		"summary": "Analysis data source is not configured yet",
		"runs":    []interface{}{},
	})
}

type setRolloutImageRequest struct {
	Container     string `json:"container"`
	Image         string `json:"image"`
	IsInit        bool   `json:"isInitContainer"`
	InitContainer bool   `json:"initContainer"`
}

func updateImageInContainerList(containerList []interface{}, containerName, image string) ([]interface{}, bool) {
	updated := false
	result := make([]interface{}, 0, len(containerList))
	for _, item := range containerList {
		container, ok := item.(map[string]interface{})
		if !ok {
			result = append(result, item)
			continue
		}
		name, _ := container["name"].(string)
		if name == containerName {
			copyObj := runtime.DeepCopyJSON(container)
			copyObj["image"] = image
			result = append(result, copyObj)
			updated = true
			continue
		}
		result = append(result, container)
	}
	return result, updated
}

// SetRolloutImage updates image for container or initContainer in rollout referenced workload.
func SetRolloutImage(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	var req setRolloutImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request payload")
		return
	}
	if strings.TrimSpace(req.Container) == "" || strings.TrimSpace(req.Image) == "" {
		response.BadRequest(c, "container and image are required")
		return
	}
	useInitContainers := req.IsInit || req.InitContainer

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		response.InternalError(c, err)
		return
	}

	workloadRef := extractWorkloadRefFromRollout(rollout)
	if workloadRef == nil {
		response.Error(c, http.StatusConflict, "workloadRef is not configured", nil, "WORKLOAD_REF_MISSING")
		return
	}
	workloadKind, _ := workloadRef["kind"].(string)
	workloadName, _ := workloadRef["name"].(string)
	if workloadKind == "" || workloadName == "" {
		response.Error(c, http.StatusConflict, "workloadRef is incomplete", nil, "WORKLOAD_REF_INVALID")
		return
	}

	workloadGVR, _, err := resolveWorkloadRefGVR(workloadKind)
	if err != nil {
		response.Error(c, http.StatusNotImplemented, "workload kind does not support image update", err, "UNSUPPORTED_WORKLOAD_KIND")
		return
	}

	workload, err := GetDynamicClient().Resource(workloadGVR).Namespace(namespace).Get(context.TODO(), workloadName, metav1.GetOptions{})
	if err != nil {
		response.InternalError(c, err)
		return
	}

	path := []string{"spec", "template", "spec", "containers"}
	if useInitContainers {
		path = []string{"spec", "template", "spec", "initContainers"}
	}

	containerList, found, _ := unstructured.NestedSlice(workload.Object, path...)
	if !found || len(containerList) == 0 {
		response.Error(c, http.StatusNotFound, "No containers found in workload", nil, "CONTAINERS_NOT_FOUND")
		return
	}

	updatedList, updated := updateImageInContainerList(containerList, req.Container, req.Image)
	if !updated {
		response.Error(c, http.StatusNotFound, "Container not found", nil, "CONTAINER_NOT_FOUND")
		return
	}

	if err := unstructured.SetNestedSlice(workload.Object, updatedList, path...); err != nil {
		response.InternalError(c, err)
		return
	}

	if _, err = GetDynamicClient().Resource(workloadGVR).Namespace(namespace).Update(context.TODO(), workload, metav1.UpdateOptions{}); err != nil {
		response.InternalError(c, err)
		return
	}

	response.Success(c, gin.H{
		"message":       "Image updated successfully",
		"namespace":     namespace,
		"rollout":       name,
		"workloadKind":  workloadKind,
		"workloadName":  workloadName,
		"container":     req.Container,
		"image":         req.Image,
		"initContainer": useInitContainers,
	})
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

	appendContainerInfo := func(result []map[string]interface{}, containers []interface{}, containerType string) []map[string]interface{} {
		for _, c := range containers {
			cMap, ok := c.(map[string]interface{})
			if !ok {
				continue
			}
			result = append(result, map[string]interface{}{
				"name":  cMap["name"],
				"image": cMap["image"],
				"type":  containerType,
			})
		}
		return result
	}

	containers, _ := templateSpec["containers"].([]interface{})
	initContainers, _ := templateSpec["initContainers"].([]interface{})
	result := make([]map[string]interface{}, 0, len(containers)+len(initContainers))
	result = appendContainerInfo(result, containers, "container")
	result = appendContainerInfo(result, initContainers, "initContainer")

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
