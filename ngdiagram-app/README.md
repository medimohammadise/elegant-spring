# ngdiagram-app

Angular frontend for the JPA domain model viewer, now integrated into a CoreUI admin shell.

Main entry points:
- [app.routes.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/app.routes.ts)
- [default-layout.component.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/layout/default-layout/default-layout.component.ts)
- [graph.component.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts)
- [diagram-api.service.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/services/diagram-api.service.ts)

Main UI sections:
- `/#/dashboard`
- `/#/domain-model`
- `/#/users`
- `/#/settings`

CoreUI-specific additions:
- fixed sidebar with CoreUI navigation
- top bar with `Dashboard / Users / Settings`
- breadcrumb row
- bottom-right `AI Chat` launcher with a CoreUI offcanvas client

Run locally:

```bash
npm install
npm start
```

Dev server:

```bash
http://localhost:4200
```

The app expects the backend proxy target from:

- [proxy.conf.json](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/proxy.conf.json)

For the full domain-model contract and sample payload, see the root [README.md](/Users/mehdi/MyProject/elegent-spring-diagram/README.md).
