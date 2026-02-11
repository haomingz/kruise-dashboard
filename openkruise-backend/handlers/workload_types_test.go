package handlers

import (
	"testing"
)

func TestResolveWorkloadType(t *testing.T) {
	tests := []struct {
		name          string
		workloadType  string
		wantKind      string
		wantScalable  bool
		wantRestart   bool
		wantErr       bool
	}{
		{
			name:         "cloneset resolves correctly",
			workloadType: "cloneset",
			wantKind:     "CloneSet",
			wantScalable: true,
			wantRestart:  true,
		},
		{
			name:         "statefulset resolves correctly",
			workloadType: "statefulset",
			wantKind:     "StatefulSet",
			wantScalable: true,
			wantRestart:  true,
		},
		{
			name:         "daemonset is not scalable",
			workloadType: "daemonset",
			wantKind:     "DaemonSet",
			wantScalable: false,
			wantRestart:  true,
		},
		{
			name:         "broadcastjob is not scalable or restartable",
			workloadType: "broadcastjob",
			wantKind:     "BroadcastJob",
			wantScalable: false,
			wantRestart:  false,
		},
		{
			name:         "advancedcronjob is not scalable or restartable",
			workloadType: "advancedcronjob",
			wantKind:     "AdvancedCronJob",
			wantScalable: false,
			wantRestart:  false,
		},
		{
			name:         "deployment resolves correctly",
			workloadType: "deployment",
			wantKind:     "Deployment",
			wantScalable: true,
			wantRestart:  true,
		},
		{
			name:         "unsupported type returns error",
			workloadType: "unknown",
			wantErr:      true,
		},
		{
			name:         "empty type returns error",
			workloadType: "",
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			info, err := ResolveWorkloadType(tt.workloadType)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ResolveWorkloadType(%q) expected error, got nil", tt.workloadType)
				}
				return
			}
			if err != nil {
				t.Fatalf("ResolveWorkloadType(%q) unexpected error: %v", tt.workloadType, err)
			}
			if info.Kind != tt.wantKind {
				t.Errorf("Kind = %q, want %q", info.Kind, tt.wantKind)
			}
			if info.Scalable != tt.wantScalable {
				t.Errorf("Scalable = %v, want %v", info.Scalable, tt.wantScalable)
			}
			if info.Restartable != tt.wantRestart {
				t.Errorf("Restartable = %v, want %v", info.Restartable, tt.wantRestart)
			}
			if info.GVR.Resource == "" {
				t.Error("GVR.Resource should not be empty")
			}
		})
	}
}

func TestExtractLabelSelector(t *testing.T) {
	tests := []struct {
		name     string
		obj      map[string]interface{}
		expected string
	}{
		{
			name:     "empty object",
			obj:      map[string]interface{}{},
			expected: "",
		},
		{
			name: "single matchLabel",
			obj: map[string]interface{}{
				"spec": map[string]interface{}{
					"selector": map[string]interface{}{
						"matchLabels": map[string]interface{}{
							"app": "nginx",
						},
					},
				},
			},
			expected: "app=nginx",
		},
		{
			name: "no selector",
			obj: map[string]interface{}{
				"spec": map[string]interface{}{},
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractLabelSelector(tt.obj)
			if result != tt.expected {
				t.Errorf("extractLabelSelector() = %q, want %q", result, tt.expected)
			}
		})
	}
}
