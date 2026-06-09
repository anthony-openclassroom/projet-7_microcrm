package com.openclassroom.devops.orion.microcrm;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrganizationTest {

    @Test
    void settersAndGetters_workCorrectly() {
        Organization org = new Organization();
        org.setName("Acme Corp");
        assertEquals("Acme Corp", org.getName());
    }

    @Test
    void addPerson_whenListIsNull_createsListAndAdds() {
        Organization org = new Organization();
        Person person = new Person("Alice", "Dupont", "alice@example.com");

        List<Person> result = org.addPerson(person);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertTrue(result.contains(person));
    }

    @Test
    void addPerson_whenListNotNull_appendsPerson() {
        Organization org = new Organization();
        Person p1 = new Person("Alice", "Dupont", "alice@example.com");
        Person p2 = new Person("Bob", "Martin", "bob@example.com");

        org.addPerson(p1);
        List<Person> result = org.addPerson(p2);

        assertEquals(2, result.size());
        assertTrue(result.contains(p1));
        assertTrue(result.contains(p2));
    }

    @Test
    void removePerson_removesPerson() {
        Organization org = new Organization();
        Person person = new Person("Alice", "Dupont", "alice@example.com");

        org.addPerson(person);
        List<Person> result = org.removePerson(person);

        assertFalse(result.contains(person));
    }

    @Test
    void removePerson_whenListIsNull_returnsEmptyList() {
        Organization org = new Organization();
        Person person = new Person("Alice", "Dupont", "alice@example.com");

        List<Person> result = org.removePerson(person);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void setPersons_replacesExistingList() {
        Organization org = new Organization();
        Person p1 = new Person("Alice", "Dupont", "alice@example.com");
        Person p2 = new Person("Bob", "Martin", "bob@example.com");

        org.addPerson(p1);
        org.setPersons(List.of(p2));

        assertEquals(1, org.getPersons().size());
        assertTrue(org.getPersons().contains(p2));
    }
}
