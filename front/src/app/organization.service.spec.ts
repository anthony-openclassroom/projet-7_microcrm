import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { OrganizationService } from './organization.service';
import { API_BASE_URL } from './config';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        { provide: HttpClient, useValue: httpSpy }
      ]
    });
    service = TestBed.inject(OrganizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetchAll returns organizations list from _embedded', async () => {
    const mockOrgs = [{ id: 1, name: 'ACME', createdAt: new Date(), persons: [] }];
    httpSpy.get.and.returnValue(of({ _embedded: { organizations: mockOrgs } }));

    const result = await service.fetchAll();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('ACME');
    expect(httpSpy.get).toHaveBeenCalledWith(`${API_BASE_URL}/organizations`);
  });

  it('fetchOrganizationPersons returns persons list from _embedded', async () => {
    const mockPersons = [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com', phone: '', bio: '', createdAt: new Date(), organizations: [] }];
    httpSpy.get.and.returnValue(of({ _embedded: { persons: mockPersons } }));

    const result = await service.fetchOrganizationPersons(1);

    expect(result.length).toBe(1);
    expect(result[0].firstName).toBe('John');
    expect(httpSpy.get).toHaveBeenCalledWith(`${API_BASE_URL}/organizations/1/persons`);
  });

  it('fetchById returns organization with persons populated', async () => {
    const mockOrg = { id: 1, name: 'ACME', createdAt: new Date() };
    const mockPersons = [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com', phone: '', bio: '', createdAt: new Date(), organizations: [] }];

    httpSpy.get.and.callFake((url: string) => {
      if (url.includes('/persons')) {
        return of({ _embedded: { persons: mockPersons } }) as any;
      }
      return of(mockOrg) as any;
    });

    const result = await service.fetchById(1);

    expect(result.id).toBe(1);
    expect(result.persons.length).toBe(1);
    expect(httpSpy.get).toHaveBeenCalledTimes(2);
  });

  it('deleteById sends DELETE to /organizations/:id', async () => {
    httpSpy.delete.and.returnValue(of(null));

    await service.deleteById(1);

    expect(httpSpy.delete).toHaveBeenCalledWith(`${API_BASE_URL}/organizations/1`);
  });

  it('save sends POST when organization has no id', async () => {
    const newOrg = { name: 'New Corp', createdAt: new Date(), persons: [] };
    const savedOrg = { id: 3, ...newOrg };

    httpSpy.post.and.returnValue(of(savedOrg));
    httpSpy.get.and.returnValue(of({ _embedded: { persons: [] } }));

    const result = await service.save(newOrg);

    expect(result.id).toBe(3);
    expect(httpSpy.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/organizations`,
      jasmine.objectContaining({ name: 'New Corp' })
    );
  });

  it('save sends PUT when organization has an id', async () => {
    const existingOrg = { id: 1, name: 'Old Corp', createdAt: new Date(), persons: [] };

    httpSpy.put.and.returnValue(of(existingOrg));
    httpSpy.get.and.returnValue(of({ _embedded: { persons: [] } }));

    await service.save(existingOrg);

    expect(httpSpy.put).toHaveBeenCalledWith(
      `${API_BASE_URL}/organizations/1`,
      jasmine.objectContaining({ name: 'Old Corp' })
    );
  });

  it('addPerson sends POST to /organizations/:orgId/persons with text/uri-list header', async () => {
    httpSpy.post.and.returnValue(of(null));

    await service.addPerson(1, 2);

    expect(httpSpy.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/organizations/1/persons`,
      `${API_BASE_URL}/persons/2`,
      jasmine.objectContaining({ headers: jasmine.objectContaining({ 'Content-Type': 'text/uri-list' }) })
    );
  });

  it('removePerson sends DELETE to /organizations/:orgId/persons/:personId', async () => {
    httpSpy.delete.and.returnValue(of(null));

    await service.removePerson(1, 2);

    expect(httpSpy.delete).toHaveBeenCalledWith(`${API_BASE_URL}/organizations/1/persons/2`);
  });
});
