package com.openclassroom.devops.orion.microcrm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PersonRestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllPersons_returns200WithEmbeddedList() throws Exception {
        mockMvc.perform(get("/persons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.persons").isArray());
    }

    @Test
    void createPerson_returns201WithLocation() throws Exception {
        String json = """
                {"firstName":"Test","lastName":"User","email":"test.create@example.com","phone":"","bio":""}
                """;
        mockMvc.perform(post("/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"));
    }

    @Test
    void getPersonById_existingId_returns200() throws Exception {
        String json = """
                {"firstName":"Alice","lastName":"Dupont","email":"alice.get@example.com"}
                """;
        String location = mockMvc.perform(post("/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Alice"));
    }

    @Test
    void getPersonById_nonExistingId_returns404() throws Exception {
        mockMvc.perform(get("/persons/99999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchPerson_returns2xxAndUpdatesField() throws Exception {
        String createJson = """
                {"firstName":"Bob","lastName":"Martin","email":"bob.patch@example.com"}
                """;
        String location = mockMvc.perform(post("/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        String patchJson = """
                {"firstName":"Robert"}
                """;
        mockMvc.perform(patch(location)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchJson))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Robert"));
    }

    @Test
    void deletePerson_returns204AndThenGiveNotFound() throws Exception {
        String json = """
                {"firstName":"Charlie","lastName":"Brown","email":"charlie.del@example.com"}
                """;
        String location = mockMvc.perform(post("/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        mockMvc.perform(delete(location))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(location))
                .andExpect(status().isNotFound());
    }

    @Test
    void searchByEmail_existingEmail_returns200() throws Exception {
        String json = """
                {"firstName":"Diana","lastName":"Prince","email":"diana.search@example.com"}
                """;
        mockMvc.perform(post("/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/persons/search/findByEmail")
                        .param("email", "diana.search@example.com"))
                .andExpect(status().isOk());
    }

    @Test
    void getPersonsWithPagination_returnsPageMetadata() throws Exception {
        mockMvc.perform(get("/persons").param("page", "0").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").exists());
    }
}
