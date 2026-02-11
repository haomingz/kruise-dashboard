package handlers

import (
	"fmt"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

// WorkloadTypeInfo holds metadata about a workload type
type WorkloadTypeInfo struct {
	GVR         schema.GroupVersionResource
	Kind        string
	Scalable    bool
	Restartable bool
}

var workloadTypeRegistry = map[string]WorkloadTypeInfo{
	"deployment": {
		GVR:         schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"},
		Kind:        "Deployment",
		Scalable:    true,
		Restartable: true,
	},
	"cloneset": {
		GVR:         schema.GroupVersionResource{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "clonesets"},
		Kind:        "CloneSet",
		Scalable:    true,
		Restartable: true,
	},
	"statefulset": {
		GVR:         schema.GroupVersionResource{Group: "apps.kruise.io", Version: "v1beta1", Resource: "statefulsets"},
		Kind:        "StatefulSet",
		Scalable:    true,
		Restartable: true,
	},
	"daemonset": {
		GVR:         schema.GroupVersionResource{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "daemonsets"},
		Kind:        "DaemonSet",
		Scalable:    false,
		Restartable: true,
	},
	"broadcastjob": {
		GVR:         schema.GroupVersionResource{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "broadcastjobs"},
		Kind:        "BroadcastJob",
		Scalable:    false,
		Restartable: false,
	},
	"advancedcronjob": {
		GVR:         schema.GroupVersionResource{Group: "apps.kruise.io", Version: "v1alpha1", Resource: "advancedcronjobs"},
		Kind:        "AdvancedCronJob",
		Scalable:    false,
		Restartable: false,
	},
}

// ResolveWorkloadType resolves a workload type string to its GVR and metadata.
// Returns an error if the type is not supported.
func ResolveWorkloadType(workloadType string) (WorkloadTypeInfo, error) {
	info, ok := workloadTypeRegistry[workloadType]
	if !ok {
		return WorkloadTypeInfo{}, fmt.Errorf("unsupported workload type: %s", workloadType)
	}
	return info, nil
}
