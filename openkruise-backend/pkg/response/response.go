package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openkruise/kruise-dashboard/extensions-backend/pkg/logger"
	"go.uber.org/zap"
)

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	TraceID string `json:"trace_id"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// SuccessResponse represents a standard success response
type SuccessResponse struct {
	Data interface{} `json:"data"`
}

// Error sends a standardized error response
func Error(c *gin.Context, statusCode int, message string, err error, code string) {
	traceID := uuid.New().String()

	// Log the error with trace ID
	if err != nil {
		logger.Log.Error("Request failed",
			zap.String("trace_id", traceID),
			zap.String("path", c.Request.URL.Path),
			zap.String("method", c.Request.Method),
			zap.Int("status", statusCode),
			zap.Error(err),
		)
	}

	c.JSON(statusCode, ErrorResponse{
		TraceID: traceID,
		Message: message,
		Code:    code,
	})
}

// Success sends a standardized success response
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Data: data,
	})
}

// BadRequest sends a 400 error response
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message, nil, "BAD_REQUEST")
}

// InternalError sends a 500 error response
func InternalError(c *gin.Context, err error) {
	Error(c, http.StatusInternalServerError, "An internal error occurred", err, "INTERNAL_ERROR")
}

// NotFound sends a 404 error response
func NotFound(c *gin.Context, resource string) {
	Error(c, http.StatusNotFound, resource+" not found", nil, "NOT_FOUND")
}

// Unauthorized sends a 401 error response
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message, nil, "UNAUTHORIZED")
}
