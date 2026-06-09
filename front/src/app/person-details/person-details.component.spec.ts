import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonDetailsComponent } from './person-details.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from "@angular/router/testing";
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { PersonService } from '../person.service';
import { OrganizationService } from '../organization.service';

const mockPerson = {
  id: 1, firstName: 'John', lastName: 'Doe', email: 'j@test.com',
  phone: '', bio: '', createdAt: new Date(), organizations: []
};

describe('PersonDetailsComponent — new mode', () => {
  let component: PersonDetailsComponent;
  let fixture: ComponentFixture<PersonDetailsComponent>;
  let personService: PersonService;
  let organizationService: OrganizationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonDetailsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ personId: 'new' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PersonDetailsComponent);
    component = fixture.componentInstance;
    personService = TestBed.inject(PersonService);
    organizationService = TestBed.inject(OrganizationService);

    spyOn(organizationService, 'fetchAll').and.returnValue(Promise.resolve([]));
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set isNew to true when personId param is "new"', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.isNew).toBeTrue();
  });

  it('should navigate to persons/:id after save when creating new', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    spyOn(personService, 'save').and.returnValue(Promise.resolve({ ...mockPerson, id: 10 }));

    await component.savePerson();

    expect(navigateSpy).toHaveBeenCalledWith(['persons', 10]);
  });
});

describe('PersonDetailsComponent — edit mode', () => {
  let component: PersonDetailsComponent;
  let fixture: ComponentFixture<PersonDetailsComponent>;
  let personService: PersonService;
  let organizationService: OrganizationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonDetailsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ personId: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PersonDetailsComponent);
    component = fixture.componentInstance;
    personService = TestBed.inject(PersonService);
    organizationService = TestBed.inject(OrganizationService);

    spyOn(organizationService, 'fetchAll').and.returnValue(Promise.resolve([]));
    spyOn(personService, 'fetchById').and.returnValue(Promise.resolve(mockPerson));
  });

  it('should load person by id and set isNew to false', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(personService.fetchById).toHaveBeenCalledWith(1);
    expect(component.person.firstName).toBe('John');
    expect(component.isNew).toBeFalse();
  });

  it('should call deleteById and navigate to root after delete', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    spyOn(personService, 'deleteById').and.returnValue(Promise.resolve());

    await component.deletePerson();

    expect(personService.deleteById).toHaveBeenCalledWith(1);
    expect(navigateSpy).toHaveBeenCalledWith(['']);
  });

  it('should update person in place after save without navigation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const updatedPerson = { ...mockPerson, firstName: 'Johnny' };
    spyOn(personService, 'save').and.returnValue(Promise.resolve(updatedPerson));

    await component.savePerson();

    expect(component.person.firstName).toBe('Johnny');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
