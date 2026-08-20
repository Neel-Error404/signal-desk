import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ReleaseCommunicationReader,
  ReleaseCommunicationRecord,
  ReleaseCommunicationWriter
} from "../application";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class PrismaReleaseCommunicationStore
  implements ReleaseCommunicationReader, ReleaseCommunicationWriter
{
  constructor(private readonly prisma: PrismaLike) {}

  async create(record: ReleaseCommunicationRecord): Promise<ReleaseCommunicationRecord> {
    return this.prisma.releaseCommunication.create({ data: record });
  }

  async getByCompletedFixId(
    completedFixId: string
  ): Promise<ReleaseCommunicationRecord | null> {
    return this.prisma.releaseCommunication.findUnique({ where: { completedFixId } });
  }
}
