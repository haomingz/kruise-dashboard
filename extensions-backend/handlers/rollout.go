package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var rolloutGVR = schema.GroupVersionResource{
	Group:    "rollouts.kruise.io",
	Version:  "v1beta1",
	Resource: "rollouts",
}

// GetRolloutStatus returns the current status of a rollout
func GetRolloutStatus(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rollout.Object)
}

// GetRolloutHistory returns the revision history of a rollout
func GetRolloutHistory(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	status, found, _ := unstructured.NestedMap(rollout.Object, "status")
	if !found {
		c.JSON(http.StatusOK, gin.H{"history": nil})
		return
	}
	history, found, _ := unstructured.NestedSlice(status, "history")
	if !found {
		c.JSON(http.StatusOK, gin.H{"history": nil})
		return
	}
	c.JSON(http.StatusOK, history)
}

// PauseRollout sets the .spec.paused field to true
func PauseRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := unstructured.SetNestedField(rollout.Object, true, "spec", "paused"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rollout paused successfully"})
}

// ResumeRollout sets the .spec.paused field to false
func ResumeRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := unstructured.SetNestedField(rollout.Object, false, "spec", "paused"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rollout resumed successfully"})
}

// UndoRollout is a placeholder (real logic would require more context, e.g. revision history)
func UndoRollout(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Undo not implemented in backend example. Use CLI for advanced operations."})
}

// RestartRollout adds a restart annotation
func RestartRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	annotations, found, _ := unstructured.NestedStringMap(rollout.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise.io/restart"] = time.Now().Format(time.RFC3339)
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rollout restarted successfully"})
}

// ApproveRollout adds an approval annotation
func ApproveRollout(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	rollout, err := GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	annotations, found, _ := unstructured.NestedStringMap(rollout.Object, "metadata", "annotations")
	if !found {
		annotations = map[string]string{}
	}
	annotations["kruise.io/approved"] = "true"
	if err := unstructured.SetNestedStringMap(rollout.Object, annotations, "metadata", "annotations"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = GetDynamicClient().Resource(rolloutGVR).Namespace(namespace).Update(context.TODO(), rollout, metav1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rollout approved successfully"})
}

// ListAllRollouts lists all rollouts in a namespace
func ListAllRollouts(c *gin.Context) {
	namespace := c.Param("namespace")
	gvr := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1beta1", Resource: "rollouts"}
	list, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	items := make([]interface{}, 0, len(list.Items))
	for _, item := range list.Items {
		items = append(items, item.Object)
	}
	c.JSON(http.StatusOK, items)
}

// ListActiveRollouts lists only active rollouts in a namespace
func ListActiveRollouts(c *gin.Context) {
	namespace := c.Param("namespace")
	active := []interface{}{}
	gvr := schema.GroupVersionResource{Group: "rollouts.kruise.io", Version: "v1beta1", Resource: "rollouts"}
	list, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
	c.JSON(http.StatusOK, active)
}
