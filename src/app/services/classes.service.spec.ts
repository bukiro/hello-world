/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { ClassesService } from 'src/app/services/classes.service';

describe('Service: Classes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClassesService]
    });
  });

  it('should ...', inject([ClassesService], (service: ClassesService) => {
    expect(service).toBeTruthy();
  }));
});