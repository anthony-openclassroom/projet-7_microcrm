import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { PersonService } from './person.service';
import { API_BASE_URL } from './config';

describe('PersonService', () => {
  let service: PersonService;
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        PersonService,
        { provide: HttpClient, useValue: httpSpy }
      ]
    });
    service = TestBed.inject(PersonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetchAll returns persons list from _embedded', async () => {
    const mockPersons = [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com', phone: '', bio: '', createdAt: new Date(), organizations: [] }];
    httpSpy.get.and.returnValue(of({ _embedded: { persons: mockPersons } }));

    const result = await service.fetchAll();

    expect(result.length).toBe(1);
    expect(result[0].firstName).toBe('John');
    expect(httpSpy.get).toHaveBeenCalledWith(`${API_BASE_URL}/persons`);
  });

  it('fetchPersonOrganizations returns organizations list from _embedded', async () => {
    const mockOrgs = [{ id: 1, name: 'ACME', createdAt: new Date(), persons: [] }];
    httpSpy.get.and.returnValue(of({ _embedded: { organizations: mockOrgs } }));

    const result = await service.fetchPersonOrganizations(1);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('ACME');
    expect(httpSpy.get).toHaveBeenCalledWith(`${API_BASE_URL}/persons/1/organizations`);
  });

  it('fetchById returns person with organizations populated', async () => {
    const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com', phone: '', bio: '', createdAt: new Date() };
    const mockOrgs = [{ id: 1, name: 'ACME', createdAt: new Date(), persons: [] }];

    httpSpy.get.and.callFake((url: string) => {
      if (url.includes('/organizations')) {
        return of({ _embedded: { organizations: mockOrgs } }) as any;
      }
      return of(mockPerson) as any;
    });

    const result = await service.fetchById(1);

    expect(result.id).toBe(1);
    expect(result.organizations.length).toBe(1);
    expect(httpSpy.get).toHaveBeenCalledTimes(2);
  });

  it('deleteById sends DELETE to /persons/:id', async () => {
    httpSpy.delete.and.returnValue(of(null));

    await service.deleteById(1);

    expect(httpSpy.delete).toHaveBeenCalledWith(`${API_BASE_URL}/persons/1`);
  });

  it('save sends POST when person has no id', async () => {
    const newPerson = { firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: '', bio: '', createdAt: new Date(), organizations: [] };
    const savedPerson = { id: 2, ...newPerson };

    httpSpy.post.and.returnValue(of(savedPerson));
    httpSpy.get.and.returnValue(of({ _embedded: { organizations: [] } }));

    const result = await service.save(newPerson);

    expect(result.id).toBe(2);
    expect(httpSpy.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/persons`,
      jasmine.objectContaining({ firstName: 'Jane', email: 'jane@test.com' })
    );
  });

  it('save sends PUT when person has an id', async () => {
    const existingPerson = { id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com', phone: '', bio: '', createdAt: new Date(), organizations: [] };

    httpSpy.put.and.returnValue(of(existingPerson));
    httpSpy.get.and.returnValue(of({ _embedded: { organizations: [] } }));

    await service.save(existingPerson);

    expect(httpSpy.put).toHaveBeenCalledWith(
      `${API_BASE_URL}/persons/1`,
      jasmine.objectContaining({ firstName: 'John' })
    );
  });
});
