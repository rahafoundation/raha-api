import { CollectionReference } from "@google-cloud/firestore";

export const index = (operations: CollectionReference) => async ctx => {
  // TODO: Do we need to paginate?
  const ops = await operations.orderBy("created_at").get();
  const parsedOps: object[] = [];
  ops.forEach(op =>
    parsedOps.push({
      id: op.id,
      creator_uid: op.get("creator_uid"),
      op_code: op.get("op_code"),
      // This string conversion would actually be done automatically,
      // but let's be explicit about what's happening.
      // TODO: Figure out how to get Firestore to return Timestamp's instead of Dates.
      created_at: (op.get("created_at") as Date).toString(),
      data: op.get("data")
    })
  );
  ctx.body = JSON.stringify(parsedOps);
  ctx.status = 200;
};
