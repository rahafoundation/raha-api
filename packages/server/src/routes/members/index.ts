import { createApiRoute } from "..";
import { CollectionReference } from "@google-cloud/firestore";
import { ListMembersApiEndpoint } from "@raha/api-shared/dist/routes/members/definitions";
import { PublicMemberFields } from "@raha/api-shared/dist/models/Member";

/**
 * Re-export methods.
 */
export { give } from "./give";
export { createMember } from "./createMember";
export { verify } from "./verify";
export { trust } from "./trust";

export const listMembers = (membersCollection: CollectionReference) =>
  createApiRoute<ListMembersApiEndpoint>(async () => {
    const members = await membersCollection.get();
    const parsedMembers: PublicMemberFields[] = [];
    members.forEach(member =>
      parsedMembers.push({
        id: member.id,
        created_at: member.get("created_at"),
        full_name: member.get("full_name"),
        identity_video_url: member.get("identity_video_url"),
        invite_confirmed: member.get("invite_confirmed"),
        username: member.get("username")
      })
    );
    return {
      body: parsedMembers,
      status: 200
    };
  });
