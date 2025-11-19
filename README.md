# Kruise Dashboard

A comprehensive dashboard for managing OpenKruise workloads including CloneSet, Advanced StatefulSet, Advanced DaemonSet, and more. This project consists of a Go backend API and a Next.js frontend dashboard.

## Features

- **Workload Management**: View and manage CloneSet, Advanced StatefulSet, Advanced DaemonSet workloads
- **Rollout Management**: Monitor and control application rollouts with pause, resume, undo, and restart capabilities
- **Cluster Metrics**: Real-time cluster performance and resource monitoring
- **Pod Management**: Detailed pod information and status for each workload
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui components

## Prerequisites

Before you begin, ensure you have the following installed:

- **Go** (version 1.19 or higher)
- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Kubernetes cluster** with OpenKruise installed
- **kubectl** configured to access your cluster

## Project Structure

```
kruise-dashboard/
├── openkruise-backend/          # Go backend API
│   ├── handlers/                # API handlers
│   ├── repositories/            # Data access layer
│   ├── main.go                 # Main application entry point
│   ├── go.mod                  # Go dependencies
│   └── Dockerfile              # Container configuration
├── openkruise-dashboard/        # Next.js frontend
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── api/                    # API client functions
│   └── package.json            # Node.js dependencies
└── README.md                   # This file
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kruise-dashboard
```

### 2. Backend Setup

Navigate to the backend directory and install Go dependencies:

```bash
cd openkruise-backend
go mod download
```

### 3. Frontend Setup

Navigate to the frontend directory and install Node.js dependencies:

```bash
cd openkruise-dashboard
npm install
```

## Running the Application

### Option 1: Development Mode (Recommended for development)

#### Start the Backend

In one terminal, start the Go backend:

```bash
cd openkruise-backend
go run main.go
```

The backend will start on `http://localhost:8080`

#### Start the Frontend

In another terminal, start the Next.js development server:

```bash
cd openkruise-dashboard
npm run dev
```

The frontend will start on `http://localhost:3000`

### Option 2: Production Build

#### Build the Backend

```bash
cd openkruise-backend
go build -o kruise-dashboard main.go
./kruise-dashboard
```

#### Build the Frontend

```bash
cd openkruise-dashboard
npm run build
npm start
```

### Option 3: Docker Deployment

#### Build and Run Backend Container

```bash
cd openkruise-backend
docker build -t kruise-dashboard-backend .
docker run -p 8080:8080 kruise-dashboard-backend
```

## Configuration

### Backend Configuration

The backend requires access to your Kubernetes cluster. Ensure your `kubeconfig` is properly configured:

```bash
export KUBECONFIG=/path/to/your/kubeconfig
# or
kubectl config use-context your-cluster-context
```

### Frontend Configuration

The frontend is configured to connect to the backend at `http://localhost:8080`. If you change the backend URL, update the API configuration in `openkruise-dashboard/api/axiosInstance.ts`.

## API Endpoints

The backend provides the following API endpoints:

### Cluster Metrics
- `GET /api/v1/cluster/metrics` - Get cluster performance metrics

### Rollout Management
- `GET /api/v1/rollout/:namespace/:name` - Get rollout details
- `GET /api/v1/rollout/status/:namespace/:name` - Get rollout status
- `GET /api/v1/rollout/history/:namespace/:name` - Get rollout history
- `POST /api/v1/rollout/pause/:namespace/:name` - Pause rollout
- `POST /api/v1/rollout/resume/:namespace/:name` - Resume rollout
- `POST /api/v1/rollout/undo/:namespace/:name` - Undo rollout
- `POST /api/v1/rollout/restart/:namespace/:name` - Restart rollout
- `POST /api/v1/rollout/approve/:namespace/:name` - Approve rollout
- `GET /api/v1/rollout/list/:namespace` - List all rollouts
- `GET /api/v1/rollout/active/:namespace` - List active rollouts

### Workload Management
- `GET /api/v1/workload/:namespace` - List all workloads
- `GET /api/v1/workload/:namespace/:type/:name` - Get specific workload
- `GET /api/v1/workload/:namespace/:type` - List workloads by type
- `GET /api/v1/workload/:namespace/:type/:name/pods` - Get workload pods

## Troubleshooting

### Common Issues

1. **Backend won't start**: Ensure you have proper Kubernetes cluster access and OpenKruise is installed
2. **Frontend can't connect to backend**: Check that the backend is running on port 8080 and CORS is properly configured
3. **Permission denied errors**: Verify your kubectl has the necessary permissions to access OpenKruise resources

### Logs

- Backend logs are displayed in the terminal where you run `go run main.go`
- Frontend logs are available in the browser's developer console

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the OpenKruise documentation
- Review the API documentation above
