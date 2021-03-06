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
package edu.usu.sdl.openstorefront.core.model;

import edu.usu.sdl.openstorefront.core.annotation.ConsumeField;
import edu.usu.sdl.openstorefront.core.annotation.DataType;
import edu.usu.sdl.openstorefront.core.entity.Branding;
import edu.usu.sdl.openstorefront.core.entity.TopicSearchItem;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author dshurtleff
 */
public class BrandingModel
{

	@ConsumeField
	private Branding branding;

	@ConsumeField
	@DataType(TopicSearchItem.class)
	private List<TopicSearchItem> topicSearchItems = new ArrayList<>();

	public BrandingModel()
	{
	}

	public Branding getBranding()
	{
		return branding;
	}

	public void setBranding(Branding branding)
	{
		this.branding = branding;
	}

	public List<TopicSearchItem> getTopicSearchItems()
	{
		return topicSearchItems;
	}

	public void setTopicSearchItems(List<TopicSearchItem> topicSearchItems)
	{
		this.topicSearchItems = topicSearchItems;
	}

}
