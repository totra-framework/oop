import type { DomainEvent } from "./DomainEvent.js";

type DomainEventType<T> = T extends DomainEvent<infer DEType> ? DEType : string;

type ExpandedDomainEvent<E extends DomainEvent<string>> =
  E extends DomainEvent<infer EventType>
    ? EventType extends string
      ? DomainEvent<EventType>
      : never
    : never;

type PolicyHandler<E extends DomainEvent<string>> =
  (domainEvent: E) => void | Promise<void>;

type PolicyMap<E extends DomainEvent<string>> = Partial<{
  [EventType in DomainEventType<ExpandedDomainEvent<E>>]: PolicyHandler<
    Extract<ExpandedDomainEvent<E>, { event: EventType }>
  >;
}>;

export class PolicyOrchestrator {
  private policies: Map<string, ((domainEvent: DomainEvent<string>) => void)[]>;
  constructor() {
    this.policies = new Map();
  }

  registerPolicy<E extends DomainEvent<string>>(
    domainEvent: DomainEventType<E>,
    policy: (domainEvent: E) => void
  ) {
    const currentPolicies = this.policies.get(domainEvent) ?? [];
    currentPolicies.push(policy as (domainEvent: DomainEvent<string>) => void);
    this.policies.set(domainEvent, currentPolicies);
  }

  async activate(domainEvents: DomainEvent<string>[]) {
    for (const domainEvent of domainEvents) {
      const policies = this.policies.get(domainEvent.event) ?? [];
      await Promise.allSettled(policies.map((policy) => policy(domainEvent)));
    }
  }
}

export const createPolicyOrchestrator = <
  E extends DomainEvent<string>
>(policies: PolicyMap<E>) => {
  const orchestrator = new PolicyOrchestrator();
  for (const [event, handler] of Object.entries(policies)) {
    if (!handler) continue;
    orchestrator.registerPolicy(
      event as DomainEventType<ExpandedDomainEvent<E>>,
      handler as PolicyHandler<ExpandedDomainEvent<E>>
    );
  }
  return orchestrator;
};
