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

	// Extract selector labels from the workload
	var labelSelector string
	workloadObj := workload.Object
	
	if spec, ok := workloadObj["spec"].(map[string]interface{}); ok {
		if selector, ok := spec["selector"].(map[string]interface{}); ok {
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
		}
	}

	// If no selector found, try to use workload name as fallback
	if labelSelector == "" {
		labelSelector = "app=" + name
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

	// Extract pod items
	items := make([]interface{}, 0, len(pods.Items))
	for _, item := range pods.Items {
		items = append(items, item.Object)
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
