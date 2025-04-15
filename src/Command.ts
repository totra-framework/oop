import type { StandardSchemaV1 } from '@standard-schema/spec';
import { ValidationError } from './Errors.js';

export abstract class Command<Type extends string, Payload extends unknown> {
  readonly commandId?: string;
  readonly type: Type;
  readonly payload: Payload;
  readonly entityId: string;

  constructor(p: {
    type: Type;
    commandId?: string;
    entityId: string;
    payload: Payload;
  }) {
    this.type = p.type;
    this.commandId = p.commandId;
    this.entityId = p.entityId;
    this.payload = p.payload;
  }
}

export const schemaCommand = <Type extends string, Schema extends StandardSchemaV1>(p: {
  type: Type;
  schema: Schema;
  entityId: (p: StandardSchemaV1.InferInput<Schema>) => string;
}): new (props: StandardSchemaV1.InferInput<Schema>) => Command<Type, StandardSchemaV1.InferInput<Schema>> => {
  return class extends Command<Type, StandardSchemaV1.InferInput<Schema>> {
    constructor(props: StandardSchemaV1.InferInput<Schema>) {
      const parsed = p.schema['~standard'].validate(props)
      if (parsed instanceof Promise) throw new ValidationError('Totra does not support promise-based schemas yet!')
      if (parsed.issues) {
        throw new ValidationError(JSON.stringify(parsed.issues));
      }
      super({
        type: p.type,
        entityId: p.entityId(parsed.value),
        payload: parsed.value,
      });
    }
  };
}
