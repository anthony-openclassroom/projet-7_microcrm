import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Person } from './person.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './config';
import { AbstractRestService } from './abstract-rest.service';

@Injectable({ providedIn: 'root' })
export class OrganizationService extends AbstractRestService<Organization> {
  constructor(client: HttpClient) {
    super(client, 'organizations');
  }

  async fetchById(id: number): Promise<Organization> {
    const org = await this.get<Organization>(`${API_BASE_URL}/organizations/${id}`);
    org.persons = await this.fetchOrganizationPersons(org.id!);
    return org;
  }

  async fetchOrganizationPersons(id: number): Promise<Person[]> {
    return this.fetchEmbedded<Person>(`${API_BASE_URL}/organizations/${id}/persons`, 'persons');
  }

  async save(org: Organization): Promise<Organization> {
    const obs = org.id === undefined
      ? this.client.post(`${API_BASE_URL}/organizations`, { name: org.name })
      : this.client.put(`${API_BASE_URL}/organizations/${org.id}`, { name: org.name });
    const saved = await firstValueFrom(obs) as Organization;
    saved.persons = await this.fetchOrganizationPersons(saved.id!);
    return saved;
  }

  async addPerson(orgId: number, personId: number): Promise<void> {
    await firstValueFrom(this.client.put(
      `${API_BASE_URL}/organizations/${orgId}/persons`,
      `${API_BASE_URL}/persons/${personId}`,
      { headers: { 'Content-Type': 'text/uri-list' } }
    ));
  }

  async removePerson(orgId: number, personId: number): Promise<void> {
    await firstValueFrom(this.client.delete(
      `${API_BASE_URL}/persons/${personId}/organizations/${orgId}`
    ));
  }
}

export interface Organization {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
  persons: Person[];
}
