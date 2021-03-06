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
package edu.usu.sdl.openstorefront.web.test.integration;

import com.atlassian.jira.rest.client.api.domain.BasicIssue;
import edu.usu.sdl.openstorefront.common.manager.PropertiesManager;
import edu.usu.sdl.openstorefront.core.model.FeedbackTicket;
import edu.usu.sdl.openstorefront.service.manager.JiraManager;
import edu.usu.sdl.openstorefront.service.manager.resource.JiraClient;
import edu.usu.sdl.openstorefront.web.test.BaseTestCase;

/**
 *
 * @author dshurtleff
 */
public class JiraCreateTicket
		extends BaseTestCase
{

	public JiraCreateTicket()
	{
		this.description = "Jira Create Test";
	}

	@Override
	protected void runInternalTest()
	{
		try (JiraClient jiraClient = JiraManager.getClient()) {

			FeedbackTicket feedbackTicket = new FeedbackTicket();
			feedbackTicket.setTicketType("TEST-TYPE");
			feedbackTicket.setUsername("TEST");
			feedbackTicket.setFirstname("Tester");
			feedbackTicket.setLastname("Test");
			feedbackTicket.setOrganization("SDL-AUTO-TEST");
			feedbackTicket.setEmail("test@sdl.test");
			feedbackTicket.setPhone("555-555-5555");
			feedbackTicket.setSummary("TEST - AUTO TEST");
			feedbackTicket.setDescription("This was generated from an auto test.");
			feedbackTicket.getWebInformation().setLocation(PropertiesManager.getNodeName());
			feedbackTicket.getWebInformation().setUserAgent(PropertiesManager.getApplicationVersion());
			feedbackTicket.getWebInformation().setReferrer("Auto Test");
			feedbackTicket.getWebInformation().setScreenResolution("0 x 0");

			BasicIssue basicIssue = jiraClient.submitTicket(feedbackTicket);
			if (basicIssue != null) {
				results.append(basicIssue.toString());
			} else {
				failureReason.append("Unable to submit ticket...see log");
			}
		}

	}

}
