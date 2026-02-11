package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/response"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var rolloutGVR = schema.GroupVersionResource{
	Group:    "rollouts.kruise.io",
	Version:  "v1beta1",
	Resource: "rollouts",
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

// ListAllRollouts lists all rollouts in a namespace
func ListAllRollouts(c *gin.Context) {
	namespace := c.Param("namespace")

	allItems := []interface{}{}

	v1beta1GVR := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1beta1", Resource: "rollouts"}
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
	gvr := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1beta1", Resource: "rollouts"}
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

	v1beta1GVR := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1beta1", Resource: "rollouts"}
	v1beta1List, err := GetDynamicClient().Resource(v1beta1GVR).Namespace("default").List(context.TODO(), metav1.ListOptions{})
	if err == nil {
		for _, item := range v1beta1List.Items {
			allItems = append(allItems, item.Object)
		}
	}

	v1alpha1GVR := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1alpha1", Resource: "rollouts"}
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
