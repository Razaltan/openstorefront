/*
 * Copyright 2015 Space Dynamics Laboratory - Utah State University Research Foundation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package edu.usu.sdl.openstorefront.web.rest.resource;

import edu.usu.sdl.openstorefront.core.annotation.APIDescription;
import edu.usu.sdl.openstorefront.core.annotation.DataType;
import edu.usu.sdl.openstorefront.core.entity.ComponentTypeTemplate;
import edu.usu.sdl.openstorefront.doc.security.RequireAdmin;
import edu.usu.sdl.openstorefront.validation.ValidationModel;
import edu.usu.sdl.openstorefront.validation.ValidationResult;
import edu.usu.sdl.openstorefront.validation.ValidationUtil;
import java.net.URI;
import java.util.List;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.GenericEntity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 *
 * @author dshurtleff
 */
@Path("v1/resource/componenttypetemplates")
@APIDescription("Component types Template define the view for component")
public class ComponentTypeTemplateResource
		extends BaseResource
{

	@GET
	@APIDescription("Gets  component types")
	@Produces({MediaType.APPLICATION_JSON})
	@DataType(ComponentTypeTemplate.class)
	public Response getComponentTypeTemplate(
			@QueryParam("status") String status,
			@QueryParam("all") boolean all
	)
	{
		ComponentTypeTemplate componentTypeTemplate = new ComponentTypeTemplate();
		if (status == null && all == false) {
			componentTypeTemplate.setActiveStatus(ComponentTypeTemplate.ACTIVE_STATUS);
		} else if (status != null && all == false) {
			componentTypeTemplate.setActiveStatus(status);
		}

		List<ComponentTypeTemplate> componentTypeTemplates = componentTypeTemplate.findByExample();
		GenericEntity<List<ComponentTypeTemplate>> entity = new GenericEntity<List<ComponentTypeTemplate>>(componentTypeTemplates)
		{
		};
		return sendSingleEntityResponse(entity);
	}

	@GET
	@APIDescription("Gets  component types")
	@Produces({MediaType.APPLICATION_JSON})
	@DataType(ComponentTypeTemplate.class)
	@Path("/{templateCode}")
	public Response getComponentTypeTemplateById(
			@PathParam("templateCode") String type
	)
	{
		ComponentTypeTemplate componentType = new ComponentTypeTemplate();
		componentType.setTemplateCode(type);
		return sendSingleEntityResponse(componentType.find());
	}

	@POST
	@RequireAdmin
	@APIDescription("Adds a new component type")
	@Produces({MediaType.APPLICATION_JSON})
	@Consumes({MediaType.APPLICATION_JSON})
	public Response createNewComponentTypeTemplate(
			ComponentTypeTemplate componentType
	)
	{
		return handleSaveComponentTypeTemplate(componentType, true);
	}

	@PUT
	@RequireAdmin
	@APIDescription("Update a component type")
	@Produces({MediaType.APPLICATION_JSON})
	@Consumes({MediaType.APPLICATION_JSON})
	@Path("/{type}")
	public Response updateComponentTypeTemplate(
			@PathParam("type") String type,
			ComponentTypeTemplate componentType
	)
	{
		Response response = Response.status(Response.Status.NOT_FOUND).build();

		ComponentTypeTemplate found = new ComponentTypeTemplate();
		found.setTemplateCode(type);
		found = found.find();
		if (found != null) {
			componentType.setTemplateCode(type);
			response = handleSaveComponentTypeTemplate(componentType, false);
		}
		return response;
	}

	private Response handleSaveComponentTypeTemplate(ComponentTypeTemplate componentTypeTemplate, boolean post)
	{
		ValidationModel validationModel = new ValidationModel(componentTypeTemplate);
		validationModel.setConsumeFieldsOnly(true);
		ValidationResult validationResult = ValidationUtil.validate(validationModel);
		if (validationResult.valid()) {
			componentTypeTemplate = service.getComponentService().saveComponentTemplate(componentTypeTemplate);
			if (post) {
				return Response.created(URI.create("v1/resource/componenttypes/" + componentTypeTemplate.getTemplate())).entity(componentTypeTemplate).build();
			} else {
				return sendSingleEntityResponse(componentTypeTemplate);
			}
		}
		return sendSingleEntityResponse(validationResult.toRestError());
	}

	@DELETE
	@RequireAdmin
	@APIDescription("Inactives component type")
	@Path("/{type}")
	public void deleteNewEvent(
			@PathParam("type") String type
	)
	{
		service.getComponentService().removeComponentTypeTemplate(type);
	}

}