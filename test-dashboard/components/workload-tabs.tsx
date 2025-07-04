import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Clock, ExternalLink, RefreshCw, XCircle } from "lucide-react"
import Link from "next/link"

export function WorkloadTabs() {
  return (
    <Tabs defaultValue="clonesets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="clonesets">CloneSets</TabsTrigger>
        <TabsTrigger value="statefulsets">Advanced StatefulSets</TabsTrigger>
        <TabsTrigger value="daemonsets">Advanced DaemonSets</TabsTrigger>
        <TabsTrigger value="sidecars">SidecarSets</TabsTrigger>
        <TabsTrigger value="rollouts">Rollouts</TabsTrigger>
      </TabsList>
      <TabsContent value="clonesets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>CloneSets</CardTitle>
            <CardDescription>Enhanced workload for stateless applications with advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Replicas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update Strategy</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/web-frontend" className="text-primary hover:underline">
                      web-frontend
                    </Link>
                  </TableCell>
                  <TableCell>default</TableCell>
                  <TableCell>5/5</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>2d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/web-frontend">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/api-service" className="text-primary hover:underline">
                      api-service
                    </Link>
                  </TableCell>
                  <TableCell>backend</TableCell>
                  <TableCell>3/3</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>5d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/api-service">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/cache-service" className="text-primary hover:underline">
                      cache-service
                    </Link>
                  </TableCell>
                  <TableCell>backend</TableCell>
                  <TableCell>2/3</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-amber-500 animate-spin" />
                      Updating
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>1d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/cache-service">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/auth-service" className="text-primary hover:underline">
                      auth-service
                    </Link>
                  </TableCell>
                  <TableCell>security</TableCell>
                  <TableCell>2/2</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>Recreate</TableCell>
                  <TableCell>7d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/auth-service">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/analytics" className="text-primary hover:underline">
                      analytics
                    </Link>
                  </TableCell>
                  <TableCell>monitoring</TableCell>
                  <TableCell>0/2</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Failed
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>12h</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/analytics">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="statefulsets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced StatefulSets</CardTitle>
            <CardDescription>Enhanced StatefulSets with in-place update capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Replicas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update Strategy</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/postgres-db" className="text-primary hover:underline">
                      postgres-db
                    </Link>
                  </TableCell>
                  <TableCell>database</TableCell>
                  <TableCell>3/3</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>14d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/postgres-db">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/mongodb-cluster" className="text-primary hover:underline">
                      mongodb-cluster
                    </Link>
                  </TableCell>
                  <TableCell>database</TableCell>
                  <TableCell>5/5</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>8d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/mongodb-cluster">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/redis-cache" className="text-primary hover:underline">
                      redis-cache
                    </Link>
                  </TableCell>
                  <TableCell>cache</TableCell>
                  <TableCell>3/3</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>3d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/redis-cache">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/elasticsearch" className="text-primary hover:underline">
                      elasticsearch
                    </Link>
                  </TableCell>
                  <TableCell>logging</TableCell>
                  <TableCell>2/3</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-amber-500" />
                      Scaling
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>5d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/elasticsearch">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="daemonsets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced DaemonSets</CardTitle>
            <CardDescription>
              Enhanced DaemonSets with controlled rollout and in-place update capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update Strategy</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/node-exporter" className="text-primary hover:underline">
                      node-exporter
                    </Link>
                  </TableCell>
                  <TableCell>monitoring</TableCell>
                  <TableCell>12/12</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>30d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/node-exporter">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/logging-agent" className="text-primary hover:underline">
                      logging-agent
                    </Link>
                  </TableCell>
                  <TableCell>logging</TableCell>
                  <TableCell>12/12</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>15d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/logging-agent">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/network-policy" className="text-primary hover:underline">
                      network-policy
                    </Link>
                  </TableCell>
                  <TableCell>security</TableCell>
                  <TableCell>12/12</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>In-place</TableCell>
                  <TableCell>10d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/network-policy">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="sidecars" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>SidecarSets</CardTitle>
            <CardDescription>
              Manage sidecar containers across multiple pods with in-place update capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Matched Pods</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Containers</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/istio-proxy" className="text-primary hover:underline">
                      istio-proxy
                    </Link>
                  </TableCell>
                  <TableCell>istio-system</TableCell>
                  <TableCell>45/45</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>envoy</Badge>
                  </TableCell>
                  <TableCell>20d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/istio-proxy">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/logging-sidecar" className="text-primary hover:underline">
                      logging-sidecar
                    </Link>
                  </TableCell>
                  <TableCell>logging</TableCell>
                  <TableCell>38/40</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-amber-500 animate-spin" />
                      Updating
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>fluentd</Badge>
                  </TableCell>
                  <TableCell>7d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/logging-sidecar">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/metrics-collector" className="text-primary hover:underline">
                      metrics-collector
                    </Link>
                  </TableCell>
                  <TableCell>monitoring</TableCell>
                  <TableCell>40/40</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Healthy
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>prometheus-agent</Badge>
                  </TableCell>
                  <TableCell>12d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/metrics-collector">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rollouts" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Kruise Rollouts</CardTitle>
            <CardDescription>
              Progressive delivery with advanced deployment strategies and traffic management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Traffic Split</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/frontend-canary" className="text-primary hover:underline">
                      frontend-canary
                    </Link>
                  </TableCell>
                  <TableCell>default</TableCell>
                  <TableCell>
                    <Badge variant="outline">Canary</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-amber-500" />
                      In Progress (2/3 batches)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-[70%] rounded-full bg-green-500"></div>
                      <div className="h-2 w-[30%] rounded-full bg-blue-500"></div>
                      <span className="text-xs">70/30</span>
                    </div>
                  </TableCell>
                  <TableCell>2h</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/frontend-canary">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/api-bluegreen" className="text-primary hover:underline">
                      api-bluegreen
                    </Link>
                  </TableCell>
                  <TableCell>backend</TableCell>
                  <TableCell>
                    <Badge variant="outline">Blue-Green</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Ready to Switch
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-[100%] rounded-full bg-green-500"></div>
                      <div className="h-2 w-[0%] rounded-full bg-blue-500"></div>
                      <span className="text-xs">100/0</span>
                    </div>
                  </TableCell>
                  <TableCell>4h</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/api-bluegreen">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <Link href="/workloads/checkout-ab" className="text-primary hover:underline">
                      checkout-ab
                    </Link>
                  </TableCell>
                  <TableCell>ecommerce</TableCell>
                  <TableCell>
                    <Badge variant="outline">A/B Testing</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-amber-500" />
                      Testing
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-[50%] rounded-full bg-green-500"></div>
                      <div className="h-2 w-[50%] rounded-full bg-blue-500"></div>
                      <span className="text-xs">50/50</span>
                    </div>
                  </TableCell>
                  <TableCell>1d</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/workloads/checkout-ab">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
