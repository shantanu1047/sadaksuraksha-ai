# API Reference

## Health & System
- `GET /api/health`: System health
- `GET /api/states`: Supported states

## Hazards
- `GET /api/hazards`: List hazards
- `GET /api/hazards/{id}`: Hazard details
- `POST /api/hazards/inspect`: AI inspection

## Roads & Analytics
- `GET /api/roads`: Road segments
- `GET /api/analytics/summary`: Dashboard metrics

## Work Orders
- `GET /api/work-orders`: List orders
- `POST /api/work-orders/generate`: Generate clusters
- `POST /api/work-orders/{id}/status`: Update status

## AI Co-Pilot
- `POST /api/copilot/chat`: Chat assistant

## Ingestion
- `POST /api/ingest/citizen-report`
- `GET /api/ingest/citizen-report/{ticket_id}`
- `POST /api/ingest/cctv-feed`
- `POST /api/ingest/google-maps-traffic`
- `GET /api/ingest/streams`

## WebSockets
- `WS /ws/patrol-simulation`

## Frontend Routes
- `GET /`: Dashboard
- `GET /report`: Citizen Portal
