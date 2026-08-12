import { prisma } from './db';

export async function logAdminAction(actor, action, org, details) {
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      action,
      targetOrgId: org ? org.id : null,
      targetOrgName: org ? org.name : null,
      details: details || '',
    },
  });
}
