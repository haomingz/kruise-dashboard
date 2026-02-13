package main

import (
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/openkruise/kruise-dashboard/extensions-backend/handlers"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
)

func main() {
	// Load .env file if present (ignore error if file doesn't exist)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize logger
	if err := logger.InitLogger(); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Initialize Kubernetes client
	if err := handlers.InitK8sClient(); err != nil {
		log.Fatalf("Failed to initialize Kubernetes client: %v", err)
	}

	// Set Gin mode from environment
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)

	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	// Read allowed origins from environment variable, default to localhost:3000 for development
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		config.AllowOrigins = []string{"http://localhost:3000"}
		log.Println("CORS: Using default allowed origin: http://localhost:3000")
	} else {
		config.AllowOrigins = strings.Split(allowedOrigins, ",")
		log.Printf("CORS: Using allowed origins from env: %v", config.AllowOrigins)
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// API routes
	api := r.Group("/api/v1")
	{
		// Cluster endpoints
		api.GET("/cluster/metrics", handlers.GetClusterMetrics)
		api.GET("/namespaces", handlers.ListNamespaces)
		// Rollout management endpoints
		rollout := api.Group("/rollout")
		{
			rollout.GET("/:namespace/:name", handlers.GetRollout)
			rollout.GET("/:namespace/:name/pods", handlers.GetRolloutPods)
			rollout.GET("/status/:namespace/:name", handlers.GetRolloutStatus)
			rollout.GET("/history/:namespace/:name", handlers.GetRolloutHistory)
			rollout.POST("/pause/:namespace/:name", handlers.PauseRollout)
			rollout.POST("/resume/:namespace/:name", handlers.ResumeRollout)
			rollout.POST("/undo/:namespace/:name", handlers.UndoRollout)
			rollout.POST("/restart/:namespace/:name", handlers.RestartRollout)
			rollout.POST("/approve/:namespace/:name", handlers.ApproveRollout)
			rollout.POST("/abort/:namespace/:name", handlers.AbortRollout)
			rollout.POST("/retry/:namespace/:name", handlers.RetryRollout)
			rollout.GET("/list/:namespace", handlers.ListAllRollouts)
			rollout.GET("/active/:namespace", handlers.ListActiveRollouts)
		}

		// Workload management endpoints
		workload := api.Group("/workload")
		{
			workload.GET(":namespace", handlers.ListAllWorkloads)
			workload.GET(":namespace/:type/:name", handlers.GetWorkload)
			workload.GET(":namespace/:type", handlers.ListWorkloads)
			workload.GET(":namespace/:type/:name/pods", handlers.GetWorkloadPods)
			workload.POST(":namespace/:type/:name/scale", handlers.ScaleWorkload)
			workload.POST(":namespace/:type/:name/restart", handlers.RestartWorkload)
			workload.DELETE(":namespace/:type/:name", handlers.DeleteWorkload)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
