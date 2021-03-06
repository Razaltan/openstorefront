<%--
Copyright 2016 Space Dynamics Laboratory - Utah State University Research Foundation.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
--%>

<%@page import="edu.usu.sdl.openstorefront.common.manager.PropertiesManager"%>
<%
		String appVersion = PropertiesManager.getApplicationVersion();		
		request.setAttribute("appVersion", appVersion);
%>

<link href="../webjars/font-awesome/4.4.0/css/font-awesome.min.css" rel="stylesheet" type="text/css"/>
<link href="css/app.css?v=${appVersion}" rel="stylesheet" type="text/css"/>	

<style>
	.print-general-block {
		border: 1px solid black;		
	}

	.print-section {
		padding: 5px;
	}

	.print-right-block {
		float: right;
		position: relative;
		left: -1px;
		width: 250px;		
	}

	.print-left-block {
		overflow: hidden;		
	}	

	.print-tags {
		padding: 3px;		
		border: 1px solid lightgrey;
		border-radius: 2px 2px 2px 2px;
	}

	.print-table {
		border-collapse: collapse;
		border: 1px solid lightgrey;			
	}

	td.print-table {
		border-collapse: collapse;
		border: 1px solid lightgrey;
		padding: 5px;
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	tr.print-table:nth-child(odd) {
		background: whitesmoke;
	}

</style>

<!-- Right Block -->
<tpl if="show.evaluation">
	<tpl if="evaluation && evaluation.evaluationSections && evaluation.evaluationSections.length &gt; 0">
		<div class="print-right-block print-general-block print-section">
			<h2>Reusability Factors (5=best)</h2>
			<table class="print-table" style="width: 100%">
				<tpl for="evaluation.evaluationSections">
					<tr class="print-table">
						<td class="print-table">{name}</td>
						<td class="print-table">{display}</td>
					</tr>
				</tpl>
			</table>
		</div>
	</tpl>
</tpl>

<tpl if="!show.evaluation || !evaluation || !evaluation.evaluationSections || !evaluation.evaluationSections.length &gt; 0">
	<tpl if="(show.vitals && vitals.length &gt; 0) || (show.contacts && contacts.length &gt; 0)">
		<div class="print-right-block print-general-block print-section">
			<tpl if="show.vitals ">
				<tpl if="vitals && vitals.length &gt; 0">		
					<h3>Vitals:</h3>
					<table class="print-table" style="width: 100%">
						<tpl for="vitals">
							<tr class="print-table">
								<td class="print-table">
									<b>{label}</b>								
								</td>
								<td class="print-table alert-{highlightStyle}">
									{value}
								</td>
							</tr>
						</tpl>					
					</table>			
				</tpl>			
			</tpl>
			<tpl if="show.contacts">
				<tpl if="contacts && contacts.length &gt; 0">
					<h3>Points of Contact:</h3>		
					<tpl for="contacts">
						<div style="font-size: 14px;">
							{positionDescription}
						</div>
						<table class="print-table" style="width: 100%">
							<tr class="print-table">
								<td class="print-table">
									Name
								</td>
								<td class="print-table">
									<b>{name}</b><br>
									{organization}
								</td>
							</tr>
							<tr class="print-table">
								<td class="print-table">
									Email / Phone 
								</td>
								<td class="print-table">
									<tpl if="email">{email}</tpl><br>
									<tpl if="phone">{phone}</tpl>
								</td>
							</tr>						
						</table>
					</tpl>								
				</tpl>
			</tpl>				
		</div>	
	</tpl>
</tpl>



<!-- Left block -->
	<tpl if="show.general || show.badges">
		<div class="print-left-block print-general-block">
			<tpl if="show.general">
				<div class="print-section">
					<b>Entry:</b> {componentName}<br>
					<b>Organization:</b> {organization}<br>
					<b>Last Activity Date:</b> {lastActivityDate:date("m/d/Y H:i:s")}<br>
					<tpl if="show.views">
						<b>Views:</b> {componentViews}<br>
					</tpl>
					<tpl if="show.badges">
						<tpl for="attributes">
							<tpl if="badgeUrl"><img src="{badgeUrl}" title="{codeDescription}" width="40" /></tpl>
						</tpl>
					</tpl>				
				</div>
			</tpl>	
		</div>
	</tpl>	
	<tpl if="show.tags">
		<div class="print-left-block print-general-block print-section" style="margin-top: -1px;" >
			<tpl if="tags">
				<b>Tags: </b>
				<tpl for="tags">
					<span class="print-tags">
						{text}
					</span>
				</tpl>
			</tpl>
		</div>
	</tpl>
	<tpl if="show.description">
		<div class="print-left-block print-section">
			<h3>Description: </h3>
			{description}
		</div>
	</tpl>
	<tpl if="show.resources">
		<tpl if="resources && resources.length &gt; 0">
			<div class="print-left-block print-section">
				<h3>Resources:</h3>			
				<table class="print-table" style="width: 100%">
					<tr class="print-table">
						<td class="print-table">
							<b>Resource Type / Link</b>
						</td>
					</tr>					
					<tpl for="resources">
						<tr class="print-table">
							<td class="print-table">
								<b>{resourceTypeDesc}</b><br>
								{link}
							</td>
						</tr>
					</tpl>					
				</table>				
			</div>		
		</tpl>
	</tpl>

<tpl if="show.evaluation && evaluation && evaluation.evaluationSections &&evaluation.evaluationSections.length &gt; 0">
	<tpl if="show.vitals ">
		<tpl if="vitals && vitals.length &gt; 0">
			<div class="print-left-block print-section ">
				<h3>Vitals:</h3>
				<table class="print-table" style="width: 100%">
					<tpl for="vitals">
						<tr class="print-table">
							<td class="print-table">
								<b>{label}</b>								
							</td>
							<td class="print-table alert-{highlightStyle}">
								{value}
							</td>
						</tr>
					</tpl>					
				</table>
			</div>
		</tpl>	
	</tpl>
	<tpl if="show.contacts">
		<tpl if="contacts && contacts.length &gt; 0">
			<div class="print-left-block print-section">
				<h3>Points of Contact:</h3>
				<tpl for="contacts">
					<div style="font-size: 14px;">
						{positionDescription}
					</div>
					<table class="print-table" style="width: 100%">
						<tr class="print-table">
							<td class="print-table" style="width: 200px;">
								Name
							</td>
							<td class="print-table">
								<b>{name}</b><br>
								{organization}
							</td>
						</tr>
						<tr class="print-table">
							<td class="print-table">
								Email / Phone 
							</td>
							<td class="print-table">
								<tpl if="email">{email}</tpl><br>
								<tpl if="phone">{phone}</tpl>
							</td>
						</tr>						
					</table>
				</tpl>			
			</div>		
		</tpl>
	</tpl>
</tpl>

	<tpl if="show.dependencies">
		<tpl if="dependencies && dependencies.length &gt; 0">
			<div class="print-left-block print-section">
				<h3>Dependencies:</h3>				
				<table class="print-table" style="width: 100%">										
					<tpl for="dependencies">
						<tr class="print-table">
							<td class="print-table">
								<b>{dependencyName} {version}</b><br>
								{comment}
							</td>
						</tr>
					</tpl>					
				</table>				
			</div>		
		</tpl>
	</tpl>
	<tpl if="show.relationships">
		<tpl if="relationships && relationships.length &gt; 0">
			<div class="print-left-block print-section">
				<h3>Relationships:</h3>				
				<table class="print-table" style="width: 100%">										
					<tpl for="relationships">
						<tr class="print-table">
							<td class="print-table">
								{ownerComponentName}								
							</td>
							<td class="print-table" style="text-align: center">
								<b>{relationshipTypeDescription}</b>								
							</td>
							<td class="print-table">
								{targetComponentName}								
							</td>							
						</tr>
					</tpl>					
				</table>				
			</div>		
		</tpl>
	</tpl>

	<tpl if="show.reviews">
		<tpl if="reviews && reviews.length &gt; 0">
		<div class="pageBreak">
			<h2>Reviews</h2>
			<hr>
			<tpl for="reviews">
					<table style="width:100%"><tr>
							<td valign="top">
								<h1>{title} <br> <tpl for="ratingStars"><i class="fa fa-{star} rating-star-color"></i></tpl></h1>								
								<div class="review-who-section">{username} ({userTypeCode}) - {[Ext.util.Format.date(values.updateDate, "m/d/y")]}<tpl if="recommend"> - <b>Recommend</b></tpl></div><br>
								<b>Organization:</b> {organization}<br>
								<b>Experience:</b> {userTimeCode}<br>							
								<b>Last Used:</b> {[Ext.util.Format.date(values.lastUsed, "m/Y")]}<br>
							<td>
							<td valign="top" width="20%">
						<tpl if="pros.length &gt; 0">					
							<div class="review-pro-con-header">Pros</div>
							<tpl for="pros">
								- {text}<br>
							</tpl></tpl>
						<td>
						<td valign="top" width="20%">
						<tpl if="cons.length &gt; 0">
							<div class="review-pro-con-header">Cons</div>
							<tpl for="cons">
								- {text}<br>
							</tpl></tpl>
						<td>
						</tr></table>
					<br><b>Comments:</b><br>{comment}
					<br><br><hr>
				</tpl>			
		</div>
		</tpl>
	</tpl>
	<tpl if="show.questions">
		<tpl if="questions && questions.length &gt; 0">
			<div class="pageBreak">
				<h2>Questions</h2>
				<hr>
				<tpl for="questions">
					<div class="question-question"><span class="question-response-letter-q">Q.</span> <b>{question}</b></div>
					<div class="question-info">
						{username} ({userType}) - {[Ext.util.Format.date(values.questionUpdateDts, "m/Y")]}
					</div>
					<div style="padding-left: 10px; padding-right: 10px;">
					<tpl for="responses">
							<div class="question-response"><span class="question-response-letter">A.</span> {response}</div>
							<div class="question-info">{username} ({userType}) - {[Ext.util.Format.date(values.answeredDate, "m/d/Y")]}</div><br>	
							<hr>
					</tpl>
					</div>
				</tpl>
			</div>	
		</tpl>
	</tpl>
	<tpl if="show.media">
		<tpl if="componentMedia && componentMedia.length &gt; 0">
			<div class="pageBreak">
				<h2>Media</h2>
				<hr>
				<tpl for="componentMedia">
					<tpl if="mediaTypeCode == 'IMG'">
						<img src="{link}" style="width: 100%"><br>
						<tpl if="caption">{caption}<br></tpl>
					</tpl>
					<tpl if="mediaTypeCode != 'IMG'">
						<b>Non-Printable:</b> {contentType}<tpl if="caption"> - {caption}</tpl><tpl if="originalFileName"> - {originalFileName}</tpl><br>
					</tpl>			
					<br>
				</tpl>
			</div>	
		</tpl>
	</tpl>


