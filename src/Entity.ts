import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { DomainEvent } from "./DomainEvent.js";
import type { InternalEvent } from "./InternalEvent.js";
import { ValidationError } from "./Errors.js";

type OptionalTimestamp<T> = T extends { timestamp: number }
  ? Omit<T, "timestamp"> & { timestamp?: number }
  : T;

export abstract class Entity<
  IEvent extends InternalEvent<string, string, unknown> = InternalEvent<
    string,
    string,
    unknown
  >,
  DEvent extends DomainEvent<string> = DomainEvent<string>
> {
  private internalEvents: IEvent[] = [];

  getInternalEvents() {
    // return a copy to help prevent
    return this.internalEvents.slice();
  }

  getDomainEvents() {
    return this.reduceInternalEventsToDomainEvents(this.getInternalEvents());
  }

  protected recordEvent<E extends IEvent>(event: OptionalTimestamp<E>) {
    this.internalEvents.push({
      ...event,
      timestamp: event.timestamp ?? Date.now(),
    } as E);
  }

  abstract reduceInternalEventsToDomainEvents(events: IEvent[]): DEvent[];
}

export abstract class SchemaEntity<
  Schema extends StandardSchemaV1,
  IEvent extends InternalEvent<string, string, unknown>,
  DEvent extends DomainEvent<string>
> extends Entity<IEvent, DEvent> {
  protected state!: StandardSchemaV1.InferInput<Schema>;
}

export const schemaEntity = <
  Schema extends StandardSchemaV1,
  IEvent extends InternalEvent<string, string, unknown>,
  DEvent extends DomainEvent<string>
>(p: {
  schemaState: Schema;
  eventMapping: (events: IEvent[]) => DEvent[];
}): new (
  props: StandardSchemaV1.InferInput<Schema>
) => SchemaEntity<Schema, IEvent, DEvent> => {
  return class extends SchemaEntity<Schema, IEvent, DEvent> {
    constructor(props: StandardSchemaV1.InferInput<Schema>) {
      super();
      const parsed = p.schemaState["~standard"].validate(props);
      if (parsed instanceof Promise) {
        throw new ValidationError(
          "Totra does not support promise-based schemas yet!"
        );
      }
      if (parsed.issues) {
        throw new ValidationError(JSON.stringify(parsed.issues));
      }
      this.state = parsed.value as StandardSchemaV1.InferInput<Schema>;
    }

    reduceInternalEventsToDomainEvents(events: IEvent[]): DEvent[] {
      return p.eventMapping(events);
    }
  };
};
