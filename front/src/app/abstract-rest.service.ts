import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './config';

export abstract class AbstractRestService<T extends { id?: number }> {
  constructor(
    protected readonly client: HttpClient,
    protected readonly basePath: string
  ) {}

  protected async get<X>(url: string): Promise<X> {
    return firstValueFrom(this.client.get(url)) as Promise<X>;
  }

  protected async fetchEmbedded<X>(url: string, key: string): Promise<X[]> {
    const result = await this.get<any>(url);
    return (result['_embedded']?.[key] ?? []) as X[];
  }

  async fetchAll(): Promise<T[]> {
    return this.fetchEmbedded<T>(`${API_BASE_URL}/${this.basePath}`, this.basePath);
  }

  async deleteById(id: number): Promise<void> {
    await firstValueFrom(this.client.delete(`${API_BASE_URL}/${this.basePath}/${id}`));
  }
}
