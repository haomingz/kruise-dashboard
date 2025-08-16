import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, CheckCircle, RefreshCw, Server } from "lucide-react"

export function RolloutVisualization() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollout Visualization</CardTitle>
        <CardDescription>Visual representation of different rollout strategies</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="canary">
          <TabsList className="mb-4">
            <TabsTrigger value="canary">Canary</TabsTrigger>
            <TabsTrigger value="bluegreen">Blue-Green</TabsTrigger>
            <TabsTrigger value="ab">A/B Testing</TabsTrigger>
          </TabsList>
          <TabsContent value="canary" className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Canary Deployment</Badge>
                  <span className="text-sm font-medium">frontend-canary</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Batch 2/3</Badge>
                  <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
                </div>
              </div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Traffic Split</span>
                  <span>70% stable / 30% canary</span>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  <div className="flex h-full w-[70%] bg-green-500 items-center justify-center text-[10px] text-white">
                    v1.0
                  </div>
                  <div className="flex h-full w-[30%] bg-blue-500 items-center justify-center text-[10px] text-white">
                    v1.1
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-3 space-y-2">
                  <div className="text-xs font-medium">Stable Version (v1.0)</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={`stable-${i}`}
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900"
                      >
                        <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="text-xs font-medium">Canary Version (v1.1)</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={`canary-${i}`}
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900"
                      >
                        <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  Rollback
                </Button>
                <Button size="sm">Proceed to Next Batch</Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="bluegreen" className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Blue-Green Deployment</Badge>
                  <span className="text-sm font-medium">api-bluegreen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Ready to Switch</Badge>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Traffic Routing</span>
                  <span>100% Blue / 0% Green</span>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  <div className="flex h-full w-[100%] bg-blue-500 items-center justify-center text-[10px] text-white">
                    Blue (v1.0)
                  </div>
                  <div className="flex h-full w-[0%] bg-green-500 items-center justify-center text-[10px] text-white"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium">Blue Environment (Active)</div>
                    <Badge>v1.0</Badge>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={`blue-${i}`}
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900"
                        >
                          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium">Green Environment (Ready)</div>
                    <Badge>v1.1</Badge>
                  </div>
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={`green-${i}`}
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900"
                        >
                          <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Button className="gap-2">
                  Switch Traffic to Green
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="ab" className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">A/B Testing</Badge>
                  <span className="text-sm font-medium">checkout-ab</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Testing</Badge>
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Traffic Split</span>
                  <span>50% A / 50% B</span>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  <div className="flex h-full w-[50%] bg-indigo-500 items-center justify-center text-[10px] text-white">
                    Version A
                  </div>
                  <div className="flex h-full w-[50%] bg-purple-500 items-center justify-center text-[10px] text-white">
                    Version B
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">Version A (Original)</div>
                    <div className="text-xs text-muted-foreground">Conversion: 3.2%</div>
                  </div>
                  <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={`a-${i}`}
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900"
                        >
                          <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">Version B (New)</div>
                    <div className="text-xs text-muted-foreground">Conversion: 4.1%</div>
                  </div>
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={`b-${i}`}
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900"
                        >
                          <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  End Test
                </Button>
                <Button size="sm">Promote Version B</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
