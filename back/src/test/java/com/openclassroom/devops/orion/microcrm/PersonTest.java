package com.openclassroom.devops.orion.microcrm;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PersonTest {

    @Test
    void defaultConstructor_createsInstance() {
        assertNotNull(new Person());
    }

    @Test
    void parameterizedConstructor_setsFields() {
        Person p = new Person("John", "Doe", "john@example.com");
        assertEquals("John", p.getFirstName());
        assertEquals("Doe", p.getLastName());
        assertEquals("john@example.com", p.getEmail());
    }

    @Test
    void settersAndGetters_workCorrectly() {
        Person p = new Person();
        p.setFirstName("Jane");
        p.setLastName("Smith");
        p.setEmail("jane@example.com");
        p.setPhone("0600000000");
        p.setBio("Developer");

        assertEquals("Jane", p.getFirstName());
        assertEquals("Smith", p.getLastName());
        assertEquals("jane@example.com", p.getEmail());
        assertEquals("0600000000", p.getPhone());
        assertEquals("Developer", p.getBio());
    }
}
