export type Service = {
  id: number;
  name: string;
  priceInCents: number;
  durationInMinutes: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateServiceInput = {
  name: string;
  priceInCents: number;
  durationInMinutes: number;
};

export type UpdateServiceInput = CreateServiceInput;

export interface ServiceRepository {
  list(): Promise<Service[]>;
  getById(id: number): Promise<Service | null>;
  create(input: CreateServiceInput): Promise<Service>;
  update(id: number, input: UpdateServiceInput): Promise<Service>;
  delete(id: number): Promise<void>;
}
