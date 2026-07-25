---
name: Clawform
tagline: Safe CloudFormation workflows for Claude Code
status: pre-release
statusNote: Not released yet — pricing on request
url: https://clawform.thejoseki.com
npm: "@thejoseki/clawform"
order: 1
---

Claude writes CloudFormation fast, and just as confidently when it is wrong.
Clawform sits between the agent and the account: rules it reads before it
writes, a CLI that runs every AWS call through a changeset you confirm, and a
hook that vetoes dangerous commands before they execute. It is a deterrent at
the point of action, not a sandbox, and it says so.
