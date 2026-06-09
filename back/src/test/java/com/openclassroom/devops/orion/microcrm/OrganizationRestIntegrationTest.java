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
class OrganizationRestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllOrganizations_returns200WithEmbeddedList() throws Exception {
        mockMvc.perform(get("/organizations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.organizations").isArray());
    }

    @Test
    void createOrganization_returns201WithLocation() throws Exception {
        String json = """
                {"name":"Test Corp"}
                """;
        mockMvc.perform(post("/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"));
    }

    @Test
    void getOrganizationById_existingId_returns200() throws Exception {
        String json = """
                {"name":"Acme Inc"}
                """;
        String location = mockMvc.perform(post("/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Acme Inc"));
    }

    @Test
    void getOrganizationById_nonExistingId_returns404() throws Exception {
        mockMvc.perform(get("/organizations/99999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchOrganization_returns2xxAndUpdatesName() throws Exception {
        String createJson = """
                {"name":"Old Name"}
                """;
        String location = mockMvc.perform(post("/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        String patchJson = """
                {"name":"New Name"}
                """;
        mockMvc.perform(patch(location)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchJson))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Name"));
    }

    @Test
    void deleteOrganization_returns204() throws Exception {
        String json = """
                {"name":"To Delete Corp"}
                """;
        String location = mockMvc.perform(post("/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");

        mockMvc.perform(delete(location))
                .andExpect(status().isNoContent());
    }

    @Test
    void getOrganizationsWithPagination_returnsPageMetadata() throws Exception {
        mockMvc.perform(get("/organizations").param("page", "0").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").exists());
    }
}
