# Visualizing data flows

> This use case demonstrates how to use Poolside to generate visual representations of code structures, workflows, and architectures using Mermaid diagrams.

## About Mermaid diagrams

A Mermaid diagram is a way to create visual charts and graphs using plain text code instead of drawing tools.

How it works:

1. **Write text**: You type special commands in a text-based syntax.
2. **Automatic visualization**: The system converts your text into a professional-looking diagram.
3. **Edit diagrams**: Change the text to update the diagram instantly.

Example:

```text theme={null}
graph LR
    A[Start] --> B[Process] --> C[End]
```

This text creates a flowchart with three boxes connected by arrows.

Mermaid diagrams are commonly used for:

* Flowcharts for processes
* System architecture diagrams
* User journey maps
* Code structure documentation

## Generate Mermaid diagrams

Poolside can generate Mermaid diagram code that you can render in documentation or diagramming tools.

For example, run:

```bash theme={null}
pool exec -p "Create a Mermaid flowchart for a user login process. Return only the Mermaid code."
```

## Common diagram types

### Flowcharts

**Prompt:** `Create a flowchart showing user registration process with validation steps`

**Response:**

<CardGroup cols={2}>
  <Card title="Mermaid Code">
    ```text theme={null}
    graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
    ```
  </Card>

  <Card title="Mermaid Image">
    <img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/resources/mermaid-flowchart.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=3c55c4d6c0df8e7c1ba7ca1145e2979b" alt="Mermaid - Flowchart" width="696" height="1082" data-path="images/resources/mermaid-flowchart.png" />
  </Card>
</CardGroup>

### Sequence diagrams

**Prompt:** `Generate a sequence diagram for a login process with authentication service`

**Response:**

<CardGroup cols={2}>
  <Card title="Mermaid Code">
    ```text theme={null}
    sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: Submit form
    API->>Database: Save data
    Database-->>API: Confirm save
    API-->>User: Success message
    ```
  </Card>

  <Card title="Mermaid Image">
    <img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/resources/mermaid-sequence.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=5c458d3df9e48185550d2f9dd0ab84ab" alt="Mermaid - Sequence" width="1238" height="708" data-path="images/resources/mermaid-sequence.png" />
  </Card>
</CardGroup>

### Class diagrams

**Prompt:** `Create a class diagram for a user management system with User and Admin classes`

**Response:**

<CardGroup cols={2}>
  <Card title="Mermaid Code">
    ```text theme={null}
    classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }

    class Admin {
        +manageUsers()
        +deleteAccount()
    }

    User <|-- Admin
    ```
  </Card>

  <Card title="Mermaid Image">
    <img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/resources/mermaid-class.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=aa70372fd77717fc93c22cc6a6085b0f" alt="Mermaid - Class" width="490" height="1066" data-path="images/resources/mermaid-class.png" />
  </Card>
</CardGroup>

### State diagrams

**Prompt:** `Design a state diagram for a mobile app with foreground, background, and terminated states`

**Response:**

<CardGroup cols={2}>
  <Card title="Mermaid Code">
    ```text theme={null}
    stateDiagram-v2
    [*] --> Foreground: App Launch
    Foreground --> Background: User switches apps
    Background --> Foreground: User returns to app
    Background --> Terminated: System kills app
    Foreground --> Terminated: User force closes app
    Terminated --> Foreground: App relaunch

    state Foreground {
        [*] --> Active
        Active --> Inactive: Screen locked
        Inactive --> Active: Screen unlocked
    }

    state Background {
        [*] --> Suspended
        Suspended --> Processing: Background task starts
        Processing --> Suspended: Task completes
    }
    ```
  </Card>

  <Card title="Mermaid Image">
    <img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/resources/mermaid-state.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=1084fbc00d5e94566ecef577b2be2fb0" alt="Mermaid - State" width="712" height="1078" data-path="images/resources/mermaid-state.png" />
  </Card>
</CardGroup>
