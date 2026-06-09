import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationDetailsComponent } from './organization-details.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from "@angular/router/testing";
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { OrganizationService } from '../organization.service';

const mockOrg = { id: 1, name: 'ACME', createdAt: new Date(), persons: [] };

describe('OrganizationDetailsComponent — new mode', () => {
  let component: OrganizationDetailsComponent;
  let fixture: ComponentFixture<OrganizationDetailsComponent>;
  let organizationService: OrganizationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationDetailsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ orgId: 'new' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationDetailsComponent);
    component = fixture.componentInstance;
    organizationService = TestBed.inject(OrganizationService);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set isNew to true when orgId param is "new"', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.isNew).toBeTrue();
  });

  it('should navigate to organizations/:id after save when creating new', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const savedOrg = { ...mockOrg, id: 5 };
    spyOn(organizationService, 'save').and.returnValue(Promise.resolve(savedOrg));

    await component.saveOrg();

    expect(navigateSpy).toHaveBeenCalledWith(['organizations', 5]);
  });
});

describe('OrganizationDetailsComponent — edit mode', () => {
  let component: OrganizationDetailsComponent;
  let fixture: ComponentFixture<OrganizationDetailsComponent>;
  let organizationService: OrganizationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationDetailsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ orgId: '1' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationDetailsComponent);
    component = fixture.componentInstance;
    organizationService = TestBed.inject(OrganizationService);

    spyOn(organizationService, 'fetchById').and.returnValue(Promise.resolve(mockOrg));
  });

  it('should load organization by id and set isNew to false', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(organizationService.fetchById).toHaveBeenCalledWith(1);
    expect(component.org.name).toBe('ACME');
    expect(component.isNew).toBeFalse();
  });

  it('should call deleteById and navigate to root after delete', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    spyOn(organizationService, 'deleteById').and.returnValue(Promise.resolve());

    await component.deleteOrg();

    expect(organizationService.deleteById).toHaveBeenCalledWith(1);
    expect(navigateSpy).toHaveBeenCalledWith(['']);
  });

  it('should update org in place after save without navigation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const updatedOrg = { ...mockOrg, name: 'ACME Updated' };
    spyOn(organizationService, 'save').and.returnValue(Promise.resolve(updatedOrg));

    await component.saveOrg();

    expect(component.org.name).toBe('ACME Updated');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
