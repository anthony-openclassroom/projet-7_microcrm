import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Organization } from './organization.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './config';
import { AbstractRestService } from './abstract-rest.service';

@Injectable({ providedIn: 'root' })
export class PersonService extends AbstractRestService<Person> {
  constructor(client: HttpClient) {
    super(client, 'persons');
  }

  async fetchById(id: number): Promise<Person> {
    const person = await this.get<Person>(`${API_BASE_URL}/persons/${id}`);
    person.organizations = await this.fetchPersonOrganizations(person.id!);
    return person;
  }

  async fetchPersonOrganizations(id: number): Promise<Organization[]> {
    return this.fetchEmbedded<Organization>(`${API_BASE_URL}/persons/${id}/organizations`, 'organizations');
  }

  async save(person: Person): Promise<Person> {
    const payload = {
      firstName: person.firstName,
      lastName: person.lastName,
      bio: person.bio,
      phone: person.phone,
      email: person.email,
    };
    const obs = person.id === undefined
      ? this.client.post(`${API_BASE_URL}/persons`, payload)
      : this.client.put(`${API_BASE_URL}/persons/${person.id}`, payload);
    const saved = await firstValueFrom(obs) as Person;
    saved.organizations = await this.fetchPersonOrganizations(saved.id!);
    return saved;
  }
}

export interface Person {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  createdAt: Date;
  updatedAt?: Date;
  organizations: Organization[];
}
