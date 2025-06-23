package handlers

import (
	"context"
	"net/http"

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
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "containerrecreaterequests"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "advancedcronjobs"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "resourcedistributions"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "uniteddeployments"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "sidecarsets"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "podprobemarkers"},
	{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "imagepulljobs"},
	{Group: "policy.kruise.io", Version: "v1alpha1", Resource: "podunavailablebudgets"},
}

// ListAllWorkloads lists all Kruise workload resources in a namespace
func ListAllWorkloads(c *gin.Context) {
	namespace := c.Param("namespace")
	results := make(map[string][]interface{})
	for _, gvr := range kruiseWorkloadGVRs {
		list, err := GetDynamicClient().Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			results[gvr.Resource] = []interface{}{map[string]interface{}{"error": err.Error()}}
			continue
		}
		items := make([]interface{}, 0, len(list.Items))
		for _, item := range list.Items {
			items = append(items, item.Object)
		}
		results[gvr.Resource] = items
	}
	c.JSON(http.StatusOK, results)
}
