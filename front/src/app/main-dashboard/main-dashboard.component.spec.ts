import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainDashboardComponent } from './main-dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from "@angular/router/testing";
import { PersonService } from '../person.service';
import { OrganizationService } from '../organization.service';

describe('MainDashboardComponent', () => {
  let component: MainDashboardComponent;
  let fixture: ComponentFixture<MainDashboardComponent>;
  let personService: PersonService;
  let organizationService: OrganizationService;

  const mockPersons = [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'j@t.com', phone: '', bio: '', createdAt: new Date(), organizations: [] }];
  const mockOrgs = [{ id: 1, name: 'ACME', createdAt: new Date(), persons: [] }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainDashboardComponent, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MainDashboardComponent);
    component = fixture.componentInstance;
    personService = TestBed.inject(PersonService);
    organizationService = TestBed.inject(OrganizationService);
  });

  it('should create', () => {
    spyOn(personService, 'fetchAll').and.returnValue(Promise.resolve([]));
    spyOn(organizationService, 'fetchAll').and.returnValue(Promise.resolve([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load persons and organizations on init', async () => {
    spyOn(personService, 'fetchAll').and.returnValue(Promise.resolve(mockPersons));
    spyOn(organizationService, 'fetchAll').and.returnValue(Promise.resolve(mockOrgs));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.persons).toEqual(mockPersons);
    expect(component.organizations).toEqual(mockOrgs);
  });

  it('should call fetchAll on both services once during init', async () => {
    const personSpy = spyOn(personService, 'fetchAll').and.returnValue(Promise.resolve([]));
    const orgSpy = spyOn(organizationService, 'fetchAll').and.returnValue(Promise.resolve([]));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(personSpy).toHaveBeenCalledTimes(1);
    expect(orgSpy).toHaveBeenCalledTimes(1);
  });
});
