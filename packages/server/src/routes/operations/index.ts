import { CollectionReference } from "@google-cloud/firestore";

import { Operation } from "@raha/api-shared/models/Operation";
import { createApiRoute } from "..";
import { ListOperationsApiEndpoint } from "@raha/api-shared/routes/operations/definitions";

/**
 * Lists all Operations.
 *
 * TODO: allow filtering of operations.
 */
export const listOperations = (operations: CollectionReference) =>
  createApiRoute<ListOperationsApiEndpoint>(async () => {
    // TODO: Do we need to paginate?
    const ops = await operations.orderBy("created_at").get();
    const parsedOps: Operation[] = [];
    ops.forEach(op =>
      parsedOps.push({
        id: op.id,
        creator_uid: op.get("creator_uid"),
        op_code: op.get("op_code"),
        // TODO: Figure out how to get Firestore to return Timestamp's instead of Dates.
        created_at: op.get("created_at"),
        data: op.get("data")
      })
    );

    return {
      body: parsedOps,
      status: 200
    };
  });
