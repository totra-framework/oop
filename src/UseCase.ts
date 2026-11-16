import type { EntityClassInternalEvents } from "./_types.js";
import { Command } from "./Command.js";
import { Entity } from "./Entity.js";

type ConcreteEntityClass = new (...args: any[]) => Entity & {
  reduceInternalEventsToDomainEvents: (events: any[]) => any[];
};

type OptionalTimestamp<T> = T extends { timestamp: number }
  ? Omit<T, "timestamp"> & { timestamp?: number }
  : T;

type EntityState<E extends ConcreteEntityClass> = ConstructorParameters<E>[0];

export interface UseCase<T extends Command<string, unknown>> {
  handle: (command: T) => void;
}

export const createUseCase = <
  E extends ConcreteEntityClass,
  C extends new (...args: any[]) => Command<string, unknown>
>(p: {
  entity: E;
  command: C;
  handle: (
    command: InstanceType<C>,
    state: EntityState<E>
  ) => OptionalTimestamp<EntityClassInternalEvents<E>>[];
}): new (
  props: ConstructorParameters<E>[0]
) => InstanceType<E> & UseCase<InstanceType<C>> => {
  const UseCaseClass = class extends p.entity implements UseCase<InstanceType<C>> {
    handle(command: InstanceType<C>) {
      const state = (this as InstanceType<E> & { state: EntityState<E> }).state;
      const events = p.handle(command, state);
      for (const event of events) {
        this.recordEvent(event);
      }
    }
  };

  return UseCaseClass as unknown as new (
    props: ConstructorParameters<E>[0]
  ) => InstanceType<E> & UseCase<InstanceType<C>>;
};
