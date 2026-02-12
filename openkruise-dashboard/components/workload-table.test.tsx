import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransformedWorkload, WorkloadTable } from './workload-table'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockWorkloads: TransformedWorkload[] = [
  {
    name: 'test-cloneset',
    namespace: 'default',
    replicas: '3/3',
    status: 'Healthy',
    updateStrategy: 'InPlaceIfPossible',
    age: '5d',
    image: 'nginx:latest',
    workloadType: 'cloneset',
  },
  {
    name: 'api-server',
    namespace: 'production',
    replicas: '1/3',
    status: 'Updating',
    updateStrategy: 'RollingUpdate',
    age: '2h',
    image: 'api:v2',
    workloadType: 'cloneset',
  },
]

describe('WorkloadTable', () => {
  it('renders loading state', () => {
    render(<WorkloadTable workloadList={[]} type="CloneSets" loading={true} />)
    // Both sr-only and visible span have the text, use getAllByText
    const loadingTexts = screen.getAllByText('Loading CloneSets…')
    expect(loadingTexts.length).toBeGreaterThan(0)
  })

  it('renders empty state', () => {
    render(<WorkloadTable workloadList={[]} type="CloneSets" loading={false} />)
    expect(screen.getByText('No CloneSets found')).toBeInTheDocument()
  })

  it('renders workload rows', () => {
    render(<WorkloadTable workloadList={mockWorkloads} type="CloneSets" />)
    expect(screen.getByText('test-cloneset')).toBeInTheDocument()
    expect(screen.getByText('api-server')).toBeInTheDocument()
    expect(screen.getByText('3/3')).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('renders status text for each workload', () => {
    render(<WorkloadTable workloadList={mockWorkloads} type="CloneSets" />)
    const healthyElements = screen.getAllByText('Healthy')
    const updatingElements = screen.getAllByText('Updating')
    expect(healthyElements.length).toBeGreaterThan(0)
    expect(updatingElements.length).toBeGreaterThan(0)
  })

  it('shows image column by default', () => {
    render(<WorkloadTable workloadList={mockWorkloads} type="CloneSets" />)
    expect(screen.getByText('Image')).toBeInTheDocument()
    // Image values appear in title attribute and text content
    const nginxCells = screen.getAllByText('nginx:latest')
    expect(nginxCells.length).toBeGreaterThan(0)
  })

  it('hides image column when showImage is false', () => {
    render(<WorkloadTable workloadList={mockWorkloads} type="CloneSets" showImage={false} />)
    expect(screen.queryByText('Image')).not.toBeInTheDocument()
  })

  it('renders correct links', () => {
    render(<WorkloadTable workloadList={mockWorkloads} type="CloneSets" />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    // Check that workload detail link exists
    const detailLink = links.find(l => l.getAttribute('href')?.includes('/workloads/cloneset/default/test-cloneset'))
    expect(detailLink).toBeDefined()
  })
})
