package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/openkruise/kruise-dashboard/extensions-backend/handlers"
)

func main() {
	// Initialize Kubernetes client
	if err := handlers.InitK8sClient(); err != nil {
		log.Fatalf("Failed to initialize Kubernetes client: %v", err)
	}

	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// API routes
	api := r.Group("/api/v1")
	{
		// Rollout management endpoints
		rollout := api.Group("/rollout")
		{
			rollout.GET("/status/:namespace/:name", handlers.GetRolloutStatus)
			rollout.GET("/history/:namespace/:name", handlers.GetRolloutHistory)
			rollout.POST("/pause/:namespace/:name", handlers.PauseRollout)
			rollout.POST("/resume/:namespace/:name", handlers.ResumeRollout)
			rollout.POST("/undo/:namespace/:name", handlers.UndoRollout)
			rollout.POST("/restart/:namespace/:name", handlers.RestartRollout)
			rollout.POST("/approve/:namespace/:name", handlers.ApproveRollout)
			rollout.GET("/list/:namespace", handlers.ListAllRollouts)
			rollout.GET("/active/:namespace", handlers.ListActiveRollouts)
		}

		// Workload management endpoints
		workload := api.Group("/workload")
		{
			workload.GET(":namespace", handlers.ListAllWorkloads)
			workload.GET(":namespace/:type/:name", handlers.GetWorkload)
			workload.GET(":namespace/:type", handlers.ListWorkloads)
		}
	}

	r.Run(":8080")
}
