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
      data: op.get("data")
    })
  );
  ctx.body = JSON.stringify(parsedOps);
  ctx.status = 200;
};
