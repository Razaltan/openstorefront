/*
 * Copyright 2016 Space Dynamics Laboratory - Utah State University Research Foundation.
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
package edu.usu.sdl.openstorefront.core.view;

import edu.usu.sdl.openstorefront.common.exception.OpenStorefrontRuntimeException;
import edu.usu.sdl.openstorefront.core.api.ServiceProxyFactory;
import edu.usu.sdl.openstorefront.core.entity.ApprovalStatus;
import edu.usu.sdl.openstorefront.core.entity.Component;
import edu.usu.sdl.openstorefront.core.entity.UserProfile;
import edu.usu.sdl.openstorefront.core.util.TranslateUtil;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.beanutils.BeanUtils;

/**
 *
 * @author dshurtleff
 */
public class ComponentView
		extends Component
{

	private String componentTypeLabel;
	private String approvalStateLabel;
	private Integer numberOfPendingChanges;
	private String ownerEmail;

	public ComponentView()
	{
	}
	
	public static ComponentView toView(Component component, boolean populateOwnerInfo)
	{
		ComponentView componentView = toView(component);
		if (populateOwnerInfo) {
			UserProfile userProfile = ServiceProxyFactory.getServiceProxy().getUserService().getUserProfile(component.getCreateUser());
			if (userProfile != null) {
				componentView.setOwnerEmail(userProfile.getEmail());				
			}			
		}
		return componentView;
	}
	
	public static ComponentView toView(Component component)
	{
		ComponentView componentView = new ComponentView();

		try {
			BeanUtils.copyProperties(componentView, component);
		} catch (IllegalAccessException | InvocationTargetException ex) {
			throw new OpenStorefrontRuntimeException(ex);
		}
		componentView.setApprovalStateLabel(TranslateUtil.translate(ApprovalStatus.class, componentView.getApprovalState()));
		componentView.setComponentTypeLabel(TranslateUtil.translateComponentType(component.getComponentType()));

		return componentView;
	}

	public static List<ComponentView> toViewListWithUserInfo(List<Component> components)
	{
		List<ComponentView> views = new ArrayList<>();
		components.forEach(component -> {
			views.add(toView(component, true));
		});
		return views;
	}
	
	public static List<ComponentView> toViewList(List<Component> components)
	{
		List<ComponentView> views = new ArrayList<>();
		components.forEach(component -> {
			views.add(toView(component));
		});
		return views;
	}

	public Integer getNumberOfPendingChanges()
	{
		return numberOfPendingChanges;
	}

	public void setNumberOfPendingChanges(Integer numberOfPendingChanges)
	{
		this.numberOfPendingChanges = numberOfPendingChanges;
	}

	public String getComponentTypeLabel()
	{
		return componentTypeLabel;
	}

	public void setComponentTypeLabel(String componentTypeLabel)
	{
		this.componentTypeLabel = componentTypeLabel;
	}

	public String getApprovalStateLabel()
	{
		return approvalStateLabel;
	}

	public void setApprovalStateLabel(String approvalStateLabel)
	{
		this.approvalStateLabel = approvalStateLabel;
	}

	public String getOwnerEmail()
	{
		return ownerEmail;
	}

	public void setOwnerEmail(String ownerEmail)
	{
		this.ownerEmail = ownerEmail;
	}

}
