import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  Code,
  CpuIcon,
  Edit,
  ExternalLink,
  HardDrive,
  MoreHorizontal,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function WorkloadDetail() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CloneSet: web-frontend</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Namespace: default</span>
            <span>•</span>
            <span>Created 2 days ago</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Scale
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Code className="mr-2 h-4 w-4" />
                View YAML
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              <span className="font-medium">Healthy</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Replicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">5/5</span>
              <Badge variant="outline">100%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Update Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge>In-place</Badge>
              <Badge variant="outline">Partition: 0</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workload Specifications</CardTitle>
              <CardDescription>Basic configuration and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="text-sm">web-frontend</div>
                      <div className="text-sm text-muted-foreground">Namespace</div>
                      <div className="text-sm">default</div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="text-sm">2023-07-15 08:24:31</div>
                      <div className="text-sm text-muted-foreground">UID</div>
                      <div className="text-sm">a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-medium">Scaling</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Replicas</div>
                      <div className="text-sm">5</div>
                      <div className="text-sm text-muted-foreground">Min Ready Seconds</div>
                      <div className="text-sm">10</div>
                      <div className="text-sm text-muted-foreground">Scale Strategy</div>
                      <div className="text-sm">
                        <Badge variant="outline">Parallel</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Update Strategy</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="text-sm">
                        <Badge>In-place</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">Partition</div>
                      <div className="text-sm">0</div>
                      <div className="text-sm text-muted-foreground">Max Unavailable</div>
                      <div className="text-sm">20%</div>
                      <div className="text-sm text-muted-foreground">Max Surge</div>
                      <div className="text-sm">0</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-medium">Selector</h3>
                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-sm text-muted-foreground">Match Labels</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          app=web-frontend
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          tier=frontend
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          environment=production
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>CPU and memory usage across pods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CpuIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">CPU</span>
                    </div>
                    <span className="text-sm text-muted-foreground">245m / 1000m</span>
                  </div>
                  <Progress value={24.5} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <HardDrive className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Memory</span>
                    </div>
                    <span className="text-sm text-muted-foreground">512Mi / 2048Mi</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Container Specifications</CardTitle>
              <CardDescription>Container images and configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <Collapsible className="space-y-2">
                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="flex items-center space-x-4">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium leading-none">web-frontend</p>
                      <p className="text-sm text-muted-foreground">nginx:1.21.6-alpine</p>
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronDown className="h-4 w-4" />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2">
                  <div className="rounded-md border px-4 py-3 text-sm">
                    <div className="font-medium">Environment Variables</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="text-muted-foreground">NODE_ENV</div>
                      <div>production</div>
                      <div className="text-muted-foreground">API_URL</div>
                      <div>https://api.example.com</div>
                      <div className="text-muted-foreground">LOG_LEVEL</div>
                      <div>info</div>
                    </div>
                  </div>
                  <div className="rounded-md border px-4 py-3 text-sm">
                    <div className="font-medium">Resource Requests & Limits</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div></div>
                      <div className="text-muted-foreground">Requests</div>
                      <div className="text-muted-foreground">Limits</div>
                      <div className="text-muted-foreground">CPU</div>
                      <div>200m</div>
                      <div>1000m</div>
                      <div className="text-muted-foreground">Memory</div>
                      <div>256Mi</div>
                      <div>2048Mi</div>
                    </div>
                  </div>
                  <div className="rounded-md border px-4 py-3 text-sm">
                    <div className="font-medium">Ports</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Name</div>
                      <div className="text-muted-foreground">Container Port</div>
                      <div className="text-muted-foreground">Protocol</div>
                      <div>http</div>
                      <div>80</div>
                      <div>TCP</div>
                      <div>https</div>
                      <div>443</div>
                      <div>TCP</div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Managed Pods</CardTitle>
              <CardDescription>Pods managed by this CloneSet</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Restarts</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">web-frontend-0</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Running
                      </div>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>10.244.0.15</TableCell>
                    <TableCell>worker-1</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">web-frontend-1</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Running
                      </div>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>10.244.0.16</TableCell>
                    <TableCell>worker-1</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">web-frontend-2</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Running
                      </div>
                    </TableCell>
                    <TableCell>1</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>10.244.0.17</TableCell>
                    <TableCell>worker-2</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">web-frontend-3</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Running
                      </div>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>10.244.0.18</TableCell>
                    <TableCell>worker-2</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">web-frontend-4</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Running
                      </div>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>10.244.0.19</TableCell>
                    <TableCell>worker-3</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pod Details</CardTitle>
              <CardDescription>Select a pod from the table above to view its details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-6 text-center">
                <Server className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-3 text-lg font-medium">No pod selected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click on a pod in the table above to view its details
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Events related to this CloneSet</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="w-[40%]">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>ScalingReplicaSet</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Scaled up replica set web-frontend to 5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>SuccessfulCreate</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Created pod: web-frontend-0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>SuccessfulCreate</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Created pod: web-frontend-1</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>SuccessfulCreate</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Created pod: web-frontend-2</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      >
                        Warning
                      </Badge>
                    </TableCell>
                    <TableCell>FailedScheduling</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>default-scheduler</TableCell>
                    <TableCell className="font-mono text-xs">0/3 nodes are available: 3 Insufficient memory</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>SuccessfulCreate</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Created pod: web-frontend-3</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        Normal
                      </Badge>
                    </TableCell>
                    <TableCell>SuccessfulCreate</TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>cloneset-controller</TableCell>
                    <TableCell className="font-mono text-xs">Created pod: web-frontend-4</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yaml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>YAML Configuration</CardTitle>
              <CardDescription>Raw YAML configuration for this CloneSet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button variant="outline" size="sm" className="absolute right-2 top-2">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Editor
                </Button>
                <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 text-sm">
                  {`apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: web-frontend
  namespace: default
  labels:
    app: web-frontend
    tier: frontend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-frontend
      tier: frontend
      environment: production
  template:
    metadata:
      labels:
        app: web-frontend
        tier: frontend
        environment: production
    spec:
      containers:
      - name: web-frontend
        image: nginx:1.21.6-alpine
        ports:
        - name: http
          containerPort: 80
          protocol: TCP
        - name: https
          containerPort: 443
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          value: "https://api.example.com"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 2048Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
  updateStrategy:
    type: InPlaceIfPossible
    maxUnavailable: 20%
    maxSurge: 0
    partition: 0
  minReadySeconds: 10
  scaleStrategy:
    podsToDelete:
    - web-frontend-3`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
