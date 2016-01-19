/*
 * Copyright 2014 Space Dynamics Laboratory - Utah State University Research Foundation.
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
package edu.usu.sdl.openstorefront.service;

import edu.usu.sdl.openstorefront.common.exception.OpenStorefrontRuntimeException;
import edu.usu.sdl.openstorefront.common.manager.FileSystemManager;
import edu.usu.sdl.openstorefront.common.util.OpenStorefrontConstant;
import edu.usu.sdl.openstorefront.common.util.ReflectionUtil;
import edu.usu.sdl.openstorefront.common.util.TimeUtil;
import edu.usu.sdl.openstorefront.core.api.AttributeService;
import edu.usu.sdl.openstorefront.core.api.query.GenerateStatementOption;
import edu.usu.sdl.openstorefront.core.api.query.QueryByExample;
import edu.usu.sdl.openstorefront.core.api.query.QueryType;
import edu.usu.sdl.openstorefront.core.api.query.SpecialOperatorModel;
import edu.usu.sdl.openstorefront.core.entity.Article;
import edu.usu.sdl.openstorefront.core.entity.ArticleTracking;
import edu.usu.sdl.openstorefront.core.entity.AttributeCode;
import edu.usu.sdl.openstorefront.core.entity.AttributeCodePk;
import edu.usu.sdl.openstorefront.core.entity.AttributeType;
import edu.usu.sdl.openstorefront.core.entity.AttributeXRefMap;
import edu.usu.sdl.openstorefront.core.entity.AttributeXRefType;
import edu.usu.sdl.openstorefront.core.entity.Component;
import edu.usu.sdl.openstorefront.core.entity.ComponentAttribute;
import edu.usu.sdl.openstorefront.core.entity.ComponentAttributePk;
import edu.usu.sdl.openstorefront.core.entity.LookupEntity;
import edu.usu.sdl.openstorefront.core.entity.ReportOption;
import edu.usu.sdl.openstorefront.core.entity.ScheduledReport;
import edu.usu.sdl.openstorefront.core.entity.TopicSearchItem;
import edu.usu.sdl.openstorefront.core.model.Architecture;
import edu.usu.sdl.openstorefront.core.model.AttributeXrefModel;
import edu.usu.sdl.openstorefront.core.model.BulkComponentAttributeChange;
import edu.usu.sdl.openstorefront.core.sort.ArchitectureComparator;
import edu.usu.sdl.openstorefront.core.util.EntityUtil;
import edu.usu.sdl.openstorefront.core.view.ArticleTrackingCompleteWrapper;
import edu.usu.sdl.openstorefront.core.view.ArticleTrackingResult;
import edu.usu.sdl.openstorefront.core.view.ArticleView;
import edu.usu.sdl.openstorefront.core.view.AttributeCodeView;
import edu.usu.sdl.openstorefront.core.view.AttributeCodeWrapper;
import edu.usu.sdl.openstorefront.core.view.AttributeTypeWrapper;
import edu.usu.sdl.openstorefront.core.view.AttributeXRefView;
import edu.usu.sdl.openstorefront.core.view.ComponentSearchView;
import edu.usu.sdl.openstorefront.core.view.FilterQueryParams;
import edu.usu.sdl.openstorefront.security.SecurityUtil;
import edu.usu.sdl.openstorefront.service.api.AttributeServicePrivate;
import edu.usu.sdl.openstorefront.service.manager.OSFCacheManager;
import edu.usu.sdl.openstorefront.validation.HTMLSanitizer;
import edu.usu.sdl.openstorefront.validation.ValidationModel;
import edu.usu.sdl.openstorefront.validation.ValidationResult;
import edu.usu.sdl.openstorefront.validation.ValidationUtil;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import net.sf.ehcache.Element;
import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.lang3.StringUtils;

/**
 * Handles Attribute information
 *
 * @author dshurtleff
 */
public class AttributeServiceImpl
		extends ServiceProxy
		implements AttributeService, AttributeServicePrivate
{

	private static final Logger log = Logger.getLogger(AttributeServiceImpl.class.getName());

	@Override
	public List<AttributeType> getRequiredAttributes()
	{
		AttributeType example = new AttributeType();
		example.setActiveStatus(AttributeType.ACTIVE_STATUS);
		example.setRequiredFlg(Boolean.TRUE);
		List<AttributeType> required = persistenceService.queryByExample(AttributeType.class, new QueryByExample(example));
		return required;
	}

	@Override
	public List<AttributeCode> getAllAttributeCodes(String activeStatus)
	{
		List<AttributeCode> attributeCodes;
		Element element = OSFCacheManager.getAttributeCodeAllCache().get(OSFCacheManager.ALLCODE_KEY);
		if (element != null) {
			attributeCodes = (List<AttributeCode>) element.getObjectValue();
		} else {
			attributeCodes = persistenceService.queryByExample(AttributeCode.class, new AttributeCode());
			element = new Element(OSFCacheManager.ALLCODE_KEY, attributeCodes);
			OSFCacheManager.getAttributeCodeAllCache().put(element);
		}
		if (StringUtils.isNotBlank(activeStatus)) {
			attributeCodes = attributeCodes.stream().filter(code -> code.getActiveStatus().equals(activeStatus)).collect(Collectors.toList());
		}
		return attributeCodes;
	}

	@Override
	public List<AttributeCode> findCodesForType(String type)
	{
		return findCodesForType(type, false);
	}

	@Override
	public List<AttributeCode> findCodesForType(String type, boolean all)
	{
		List<AttributeCode> attributeCodes;
		if (all) {
			AttributeCode attributeCodeExample = new AttributeCode();
			AttributeCodePk attributeCodePk = new AttributeCodePk();
			attributeCodePk.setAttributeType(type);
			attributeCodeExample.setAttributeCodePk(attributeCodePk);
			attributeCodes = persistenceService.queryByExample(AttributeCode.class, new QueryByExample(attributeCodeExample));
		} else {
			Element element;
			element = OSFCacheManager.getAttributeCache().get(type);
			if (element != null) {
				attributeCodes = (List<AttributeCode>) element.getObjectValue();
			} else {

				AttributeCode attributeCodeExample = new AttributeCode();
				AttributeCodePk attributeCodePk = new AttributeCodePk();
				attributeCodePk.setAttributeType(type);
				attributeCodeExample.setAttributeCodePk(attributeCodePk);
				attributeCodeExample.setActiveStatus(AttributeCode.ACTIVE_STATUS);

				attributeCodes = persistenceService.queryByExample(AttributeCode.class, new QueryByExample(attributeCodeExample));
				element = new Element(type, attributeCodes);
				OSFCacheManager.getAttributeCache().put(element);
			}
		}
		return attributeCodes;
	}

	@Override
	public void saveAttributeType(AttributeType attributeType)
	{
		saveAttributeType(attributeType, true);
	}

	@Override
	public void saveAttributeType(AttributeType attributeType, boolean updateIndexes)
	{
		getAttributeServicePrivate().performSaveAttributeType(attributeType);

		if (updateIndexes) {
			ComponentAttributePk componentAttributePk = new ComponentAttributePk();
			componentAttributePk.setAttributeType(attributeType.getAttributeType());
			ComponentAttribute componentAttribute = new ComponentAttribute();
			componentAttribute.setComponentAttributePk(componentAttributePk);
			List<ComponentAttribute> componentAttributes = getPersistenceService().queryByExample(ComponentAttribute.class, componentAttribute);

			List<ArticleView> articles = new ArrayList<>();

			AttributeCode attributeCodeExample = new AttributeCode();
			AttributeCodePk codePk = new AttributeCodePk();
			codePk.setAttributeType(attributeType.getAttributeType());
			attributeCodeExample.setAttributeCodePk(codePk);
			List<AttributeCode> attributeCodes = persistenceService.queryByExample(AttributeCode.class, attributeCodeExample);
			for (AttributeCode attributeCode : attributeCodes) {
				if (attributeCode.getArticle() != null) {
					ArticleView article = getArticle(attributeCode.getAttributeCodePk());
					articles.add(article);
				}
			}

			List<Component> components = new ArrayList<>();
			componentAttributes.stream().forEach((attr) -> {
				components.add(persistenceService.findById(Component.class, attr.getComponentAttributePk().getComponentId()));
			});
			getSearchService().indexArticlesAndComponents(articles, components);
		}
	}

	@Override
	public void performSaveAttributeType(AttributeType attributeType)
	{
		AttributeType existing = persistenceService.findById(AttributeType.class, attributeType.getAttributeType());

		ValidationResult validationResult = attributeType.customValidation();
		if (validationResult.valid() == false) {
			throw new OpenStorefrontRuntimeException(validationResult.toString());
		}

		if (existing != null) {
			//remove to inactivate
			existing.updateFields(attributeType);
			persistenceService.persist(existing);
		} else {
			attributeType.populateBaseCreateFields();
			persistenceService.persist(attributeType);
		}
		cleanCaches(attributeType.getAttributeType());
	}

	private void cleanCaches(String attributeType)
	{
		OSFCacheManager.getAttributeCache().remove(attributeType);
		OSFCacheManager.getAttributeTypeCache().remove(attributeType);
		OSFCacheManager.getAttributeCodeAllCache().removeAll();
	}

	@Override
	public void saveAttributeCode(AttributeCode attributeCode)
	{
		saveAttributeCode(attributeCode, true);
	}

	@Override
	public void saveAttributeCode(AttributeCode attributeCode, boolean updateIndexes)
	{
		getAttributeServicePrivate().performSaveAttributeCode(attributeCode);

		if (updateIndexes) {
			ComponentAttributePk pk = new ComponentAttributePk();
			pk.setAttributeType(attributeCode.getAttributeCodePk().getAttributeType());
			pk.setAttributeCode(attributeCode.getAttributeCodePk().getAttributeCode());
			ComponentAttribute example = new ComponentAttribute();
			example.setComponentAttributePk(pk);

			List<ComponentAttribute> componentAttributes = getPersistenceService().queryByExample(ComponentAttribute.class, new QueryByExample(example));

			List<ArticleView> articles = new ArrayList<>();
			if (attributeCode.getArticle() != null) {
				ArticleView article = getArticle(attributeCode.getAttributeCodePk());
				articles.add(article);
			}

			List<Component> components = new ArrayList<>();
			componentAttributes.stream().forEach((attr) -> {
				components.add(persistenceService.findById(Component.class, attr.getComponentAttributePk().getComponentId()));
			});
			getSearchService().indexArticlesAndComponents(articles, components);
		}
	}

	@Override
	public void performSaveAttributeCode(AttributeCode attributeCode)
	{
		AttributeCode existing = persistenceService.findById(AttributeCode.class, attributeCode.getAttributeCodePk());
		if (existing != null) {
			existing.updateFields(attributeCode);
			persistenceService.persist(existing);
		} else {
			attributeCode.populateBaseCreateFields();
			persistenceService.persist(attributeCode);
		}
		cleanCaches(attributeCode.getAttributeCodePk().getAttributeType());
	}

	@Override
	public ArticleView getArticle(AttributeCodePk attributeCodePk)
	{
		ArticleView article = null;

		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeType(), "Type is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeCode(), "Code is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode != null) {
			if (attributeCode.getArticle() != null) {
				File articleDir = FileSystemManager.getDir(FileSystemManager.ARTICLE_DIR);
				try {
					byte data[] = Files.readAllBytes(Paths.get(articleDir.getPath() + "/" + attributeCode.getArticle().getArticleFilename()));
					article = ArticleView.toViewHtml(attributeCode, new String(data));
				} catch (IOException e) {
					throw new OpenStorefrontRuntimeException("Unable to find article for type: " + attributeCodePk.getAttributeType() + " code: " + attributeCodePk.getAttributeCode(), "Contact system admin to confirm file exists and is not corrupt.", e);
				}
			}
		}
		return article;
	}

	@Override
	public void saveArticle(AttributeCode attributeCode, String articleContents)
	{
		getAttributeServicePrivate().performSaveArticle(attributeCode, articleContents);
		List<ArticleView> articleViews = new ArrayList<>();
		articleViews.add(ArticleView.toViewHtml(attributeCode, articleContents));
		getSearchService().indexArticles(articleViews);
	}

	@Override
	public void saveArticle(ArticleView article)
	{
		getAttributeServicePrivate().performSaveArticle(article);
		List<ArticleView> articleViews = new ArrayList<>();
		articleViews.add(article);
		getSearchService().indexArticles(articleViews);
	}

	@Override
	public void performSaveArticle(ArticleView article)
	{
		AttributeCodePk pk = new AttributeCodePk();
		AttributeCode code = new AttributeCode();
		Article temp = new Article();

		pk.setAttributeCode(article.getAttributeCode());
		pk.setAttributeType(article.getAttributeType());

		temp.setDescription(article.getDescription());
		temp.setTitle(article.getTitle());

		code.setArticle(temp);
		code.setAttributeCodePk(pk);

		performSaveArticle(code, article.getHtml());
	}

	@Override
	public void performSaveArticle(AttributeCode attributeCode, String articleContents)
	{
		Objects.requireNonNull(attributeCode, "AttributeCode is required.");
		Objects.requireNonNull(attributeCode.getArticle(), "Article is required.");
		AttributeCodePk attributeCodePk = attributeCode.getAttributeCodePk();

		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeType(), "Type is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeCode(), "Code is required.");

		AttributeCode attributeCodeExisting = persistenceService.findById(AttributeCode.class, attributeCode.getAttributeCodePk());
		if (attributeCodeExisting != null) {
			HTMLSanitizer sanitizer = new HTMLSanitizer();
			articleContents = sanitizer.santize(articleContents).toString();

			//save the article
			String filename = attributeCodeExisting.getAttributeCodePk().toKey() + ".htm";
			File articleDir = FileSystemManager.getDir(FileSystemManager.ARTICLE_DIR);
			try {
				Files.write(Paths.get(articleDir.getPath() + "/" + filename), articleContents.getBytes());

				//save attribute
				if (attributeCodeExisting.getArticle() != null) {
					attributeCodeExisting.getArticle().setArticleFilename(filename);
					attributeCodeExisting.getArticle().updateFields(attributeCode.getArticle());
					persistenceService.saveNonPkEntity(attributeCodeExisting.getArticle());
				} else {
					attributeCodeExisting.setArticle(attributeCode.getArticle());
					attributeCodeExisting.getArticle().setArticleFilename(filename);
					attributeCodeExisting.getArticle().populateBaseCreateFields();
					persistenceService.persist(attributeCodeExisting);
				}
				cleanCaches(attributeCodeExisting.getAttributeCodePk().getAttributeType());

			} catch (IOException e) {
				throw new OpenStorefrontRuntimeException("Unable to save article.", "Contact system admin.  Check permissions on the directory and make sure device has enough space.");
			}
		} else {
			throw new OpenStorefrontRuntimeException("Unable to find attribute for type: " + attributeCodePk.getAttributeType() + " code: " + attributeCodePk.getAttributeCode(), "Add attribute first before posting article");
		}
	}

	@Override
	public void deleteArticle(AttributeCodePk attributeCodePk)
	{
		getAttributeServicePrivate().performDeleteArticle(attributeCodePk);

		// currently articles don't have an 'id' so we're indexing them with
		// a composite ID made from the type and code like so:
		getSearchService().deleteById(attributeCodePk.toKey());
	}

	@Override
	public void performDeleteArticle(AttributeCodePk attributeCodePk)
	{
		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode != null) {
			attributeCode.setDetailUrl(null);
			if (attributeCode.getArticle() != null) {
				File articleDir = FileSystemManager.getDir(FileSystemManager.ARTICLE_DIR);
				File ariticleFile = new File(articleDir.getPath() + "/" + attributeCode.getArticle().getArticleFilename());
				if (ariticleFile.exists()) {
					if (ariticleFile.delete() == false) {
						log.log(Level.WARNING, "Unable to remove file");
					}
				}
				persistenceService.delete(attributeCode.getArticle());
				attributeCode.setArticle(null);
			}
			attributeCode.setUpdateUser(SecurityUtil.getCurrentUserName());
			saveAttributeCode(attributeCode, false);
		}
	}

	@Override
	public void removeAttributeType(String type)
	{
		Objects.requireNonNull(type, "Type is required.");

		AttributeType attributeType = persistenceService.findById(AttributeType.class, type);
		if (attributeType != null) {
			attributeType.setActiveStatus(AttributeCode.INACTIVE_STATUS);
			attributeType.setUpdateDts(TimeUtil.currentDate());
			attributeType.setUpdateUser(SecurityUtil.getCurrentUserName());
			persistenceService.persist(attributeType);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(type, null));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.INACTIVE);

			//Stay in the same transaction
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(type);
		}
	}

	private List<ComponentAttribute> getComponentAttributes(String type, String code)
	{
		ComponentAttribute componentAttributeExample = new ComponentAttribute();
		ComponentAttributePk componentAttributePk = new ComponentAttributePk();
		componentAttributePk.setAttributeType(type);
		componentAttributePk.setAttributeCode(code);
		componentAttributeExample.setComponentAttributePk(componentAttributePk);
		QueryByExample queryByExample = new QueryByExample(componentAttributeExample);
		queryByExample.setReturnNonProxied(false);
		return persistenceService.queryByExample(ComponentAttribute.class, queryByExample);
	}

	@Override
	public void removeAttributeCode(AttributeCodePk attributeCodePk)
	{
		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode != null) {
			attributeCode.setActiveStatus(AttributeCode.INACTIVE_STATUS);
			attributeCode.setUpdateDts(TimeUtil.currentDate());
			attributeCode.setUpdateUser(SecurityUtil.getCurrentUserName());
			persistenceService.persist(attributeCode);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(attributeCodePk.getAttributeType(), attributeCodePk.getAttributeCode()));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.INACTIVE);
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(attributeCodePk.getAttributeType());
		}
	}

	@Override
	public void cascadeDeleteAttributeType(String type)
	{
		Objects.requireNonNull(type, "Attribute type is required.");

		AttributeType attributeType = persistenceService.findById(AttributeType.class, type);
		if (attributeType != null) {
			AttributeCode attributeCodeExample = new AttributeCode();
			AttributeCodePk attributeCodePk = new AttributeCodePk();
			attributeCodePk.setAttributeType(type);
			attributeCodeExample.setAttributeCodePk(attributeCodePk);
			persistenceService.deleteByExample(attributeCodeExample);

			ArticleTracking articleTrackingExample = new ArticleTracking();
			articleTrackingExample.setAttributeType(type);
			persistenceService.deleteByExample(articleTrackingExample);

			deleteAttributeXrefType(type);

			TopicSearchItem topicSearchItemExample = new TopicSearchItem();
			topicSearchItemExample.setAttributeType(type);
			persistenceService.deleteByExample(topicSearchItemExample);

			ScheduledReport scheduledReport = new ScheduledReport();
			ReportOption reportOption = new ReportOption();
			reportOption.setCategory(type);
			scheduledReport.setReportOption(reportOption);
			persistenceService.deleteByExample(scheduledReport);

			persistenceService.delete(attributeType);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(type, null));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.DELETE);
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(type);
		}
	}

	@Override
	public void cascadeDeleteAttributeCode(AttributeCodePk attributeCodePk)
	{
		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode != null) {

			ArticleTracking articleTrackingExample = new ArticleTracking();
			articleTrackingExample.setAttributeType(attributeCodePk.getAttributeType());
			articleTrackingExample.setAttributeCode(attributeCodePk.getAttributeCode());
			persistenceService.deleteByExample(articleTrackingExample);

			AttributeXRefMap example = new AttributeXRefMap();
			example.setAttributeType(attributeCodePk.getAttributeType());
			example.setLocalCode(attributeCodePk.getAttributeCode());
			persistenceService.deleteByExample(example);

			persistenceService.delete(attributeCode);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(attributeCodePk.getAttributeType(), attributeCodePk.getAttributeCode()));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.DELETE);
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(attributeCodePk.getAttributeType());
		}
	}

	@Override
	public void activateAttributeCode(AttributeCodePk attributeCodePk)
	{
		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode != null) {
			attributeCode.setActiveStatus(AttributeCode.ACTIVE_STATUS);
			attributeCode.setUpdateDts(TimeUtil.currentDate());
			attributeCode.setUpdateUser(SecurityUtil.getCurrentUserName());
			persistenceService.persist(attributeCode);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(attributeCodePk.getAttributeType(), attributeCodePk.getAttributeCode()));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.ACTIVATE);
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(attributeCodePk.getAttributeType());
		}
	}

	@Override
	public void syncAttribute(Map<AttributeType, List<AttributeCode>> attributeMap)
	{
		AttributeType attributeTypeExample = new AttributeType();
		List<AttributeType> attributeTypes = persistenceService.queryByExample(AttributeType.class, new QueryByExample(attributeTypeExample));
		Map<String, AttributeType> existingAttributeMap = new HashMap<>();
		attributeTypes.stream().forEach((attributeType) -> {
			existingAttributeMap.put(attributeType.getAttributeType(), attributeType);
		});

		attributeMap.keySet().stream().forEach(attributeType -> {

			try {

				ValidationModel validationModel = new ValidationModel(attributeType);
				validationModel.setConsumeFieldsOnly(true);
				ValidationResult validationResult = ValidationUtil.validate(validationModel);
				if (validationResult.valid()) {
					attributeType.setAttributeType(attributeType.getAttributeType().replace(ReflectionUtil.COMPOSITE_KEY_SEPERATOR, ReflectionUtil.COMPOSITE_KEY_REPLACER));

					AttributeType existing = existingAttributeMap.get(attributeType.getAttributeType());
					if (existing != null) {
						existing.setDescription(attributeType.getDescription());
						existing.setAllowMultipleFlg(attributeType.getAllowMultipleFlg());
						existing.setArchitectureFlg(attributeType.getArchitectureFlg());
						existing.setImportantFlg(attributeType.getImportantFlg());
						existing.setRequiredFlg(attributeType.getRequiredFlg());
						existing.setVisibleFlg(attributeType.getVisibleFlg());
						existing.setDetailedDescription(attributeType.getDetailedDescription());
						existing.setHideOnSubmission(attributeType.getHideOnSubmission());
						existing.setDefaultAttributeCode(attributeType.getDefaultAttributeCode());
						existing.setActiveStatus(AttributeType.ACTIVE_STATUS);
						existing.setCreateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
						existing.setUpdateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
						saveAttributeType(existing, false);
					} else {
						attributeType.setActiveStatus(AttributeType.ACTIVE_STATUS);
						attributeType.setCreateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
						attributeType.setUpdateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
						saveAttributeType(attributeType, false);
					}

					List<AttributeCode> existingAttributeCodes = findCodesForType(attributeType.getAttributeType());
					Map<String, AttributeCode> existingCodeMap = new HashMap<>();
					for (AttributeCode attributeCode : existingAttributeCodes) {
						existingCodeMap.put(attributeCode.getAttributeCodePk().toKey(), attributeCode);
					}

					Set<String> newCodeSet = new HashSet<>();
					List<AttributeCode> attributeCodes = attributeMap.get(attributeType);
					for (AttributeCode attributeCode : attributeCodes) {
						try {
							ValidationModel validationModelCode = new ValidationModel(attributeCode);
							validationModelCode.setConsumeFieldsOnly(true);
							ValidationResult validationResultCode = ValidationUtil.validate(validationModelCode);
							if (validationResultCode.valid()) {
								attributeCode.getAttributeCodePk().setAttributeCode(attributeCode.getAttributeCodePk().getAttributeCode().replace(ReflectionUtil.COMPOSITE_KEY_SEPERATOR, ReflectionUtil.COMPOSITE_KEY_REPLACER));

								AttributeCode existingCode = existingCodeMap.get(attributeCode.getAttributeCodePk().toKey());
								if (existingCode != null) {
									if (EntityUtil.isObjectsDifferent(existingCode, attributeCode, true)) {
										existingCode.setDescription(attributeCode.getDescription());
										existingCode.setDetailUrl(attributeCode.getDetailUrl());
										existingCode.setLabel(attributeCode.getLabel());
										existingCode.setArchitectureCode(attributeCode.getArchitectureCode());
										existingCode.setBadgeUrl(attributeCode.getBadgeUrl());
										existingCode.setGroupCode(attributeCode.getGroupCode());
										existingCode.setSortOrder(attributeCode.getSortOrder());
										existingCode.setHighlightStyle(attributeCode.getHighlightStyle());
										existingCode.setActiveStatus(AttributeCode.ACTIVE_STATUS);
										existingCode.setCreateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
										existingCode.setUpdateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
										saveAttributeCode(existingCode, false);
									}
								} else {
									attributeCode.setActiveStatus(AttributeCode.ACTIVE_STATUS);
									attributeCode.setCreateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
									attributeCode.setUpdateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
									saveAttributeCode(attributeCode, false);
								}
								newCodeSet.add(attributeCode.getAttributeCodePk().toKey());
							} else {
								log.log(Level.WARNING, MessageFormat.format("(Data Sync) Unable to Add  Attribute Code:  {0} Validation Issues:\n{1}", new Object[]{attributeCode.getAttributeCodePk().toKey(), validationResult.toString()}));
							}
						} catch (Exception e) {
							log.log(Level.SEVERE, "Unable to save attribute code: " + attributeCode.getAttributeCodePk().toKey(), e);
						}
					}
					//inactive missing codes
					existingAttributeCodes.stream().forEach((attributeCode) -> {
						if (newCodeSet.contains(attributeCode.getAttributeCodePk().toKey()) == false) {
							attributeCode.setActiveStatus(LookupEntity.INACTIVE_STATUS);
							attributeCode.setUpdateUser(OpenStorefrontConstant.SYSTEM_ADMIN_USER);
							removeAttributeCode(attributeCode.getAttributeCodePk());
						}
					});
				} else {
					log.log(Level.WARNING, MessageFormat.format("(Data Sync) Unable to Add Type:  {0} Validation Issues:\n{1}", new Object[]{attributeType.getAttributeType(), validationResult.toString()}));
				}
			} catch (Exception e) {
				log.log(Level.SEVERE, "Unable to save attribute type:" + attributeType.getAttributeType(), e);
			}
		});
		//Clear cache
		OSFCacheManager.getAttributeTypeCache().removeAll();
		OSFCacheManager.getAttributeCache().removeAll();
		OSFCacheManager.getAttributeCodeAllCache().removeAll();

		getSearchService().saveAll();
	}

	@Override
	public AttributeCode findCodeForType(AttributeCodePk pk)
	{
		AttributeCode attributeCode = null;
		List<AttributeCode> attributeCodes = findCodesForType(pk.getAttributeType());
		for (AttributeCode attributeCodeCheck : attributeCodes) {
			if (attributeCodeCheck.getAttributeCodePk().getAttributeCode().equals(pk.getAttributeCode())) {
				attributeCode = attributeCodeCheck;
				break;
			}
		}

		return attributeCode;
	}

	@Override
	public AttributeType findType(String type)
	{
		AttributeType attributeType = null;

		Element element = OSFCacheManager.getAttributeTypeCache().get(type);
		if (element != null) {
			attributeType = (AttributeType) element.getObjectValue();
		} else {
			AttributeType attributeTypeExample = new AttributeType();
			attributeTypeExample.setActiveStatus(AttributeType.ACTIVE_STATUS);
			List<AttributeType> attributeTypes = persistenceService.queryByExample(AttributeType.class, new QueryByExample(attributeTypeExample));
			for (AttributeType attributeTypeCheck : attributeTypes) {
				if (attributeTypeCheck.getAttributeType().equals(type)) {
					attributeType = attributeTypeCheck;
				}
				element = new Element(attributeTypeCheck.getAttributeType(), attributeTypeCheck);
				OSFCacheManager.getAttributeTypeCache().put(element);
			}
		}

		return attributeType;
	}

	@Override
	public List<AttributeCode> findRecentlyAddedArticles(Integer maxResults)
	{
		return findRecentlyAddedArticles(maxResults, AttributeCode.ACTIVE_STATUS);
	}

	@Override
	public List<AttributeCode> findRecentlyAddedArticles(Integer maxResults, String activeStatus)
	{
		String query;

		String activeStatusQuery = "";
		if (StringUtils.isNotBlank(activeStatus)) {
			activeStatusQuery = "activeStatus = :activeStatusParam and ";
		}

		if (maxResults != null) {
			query = "select from AttributeCode where  " + activeStatusQuery
					+ " article is not null "
					+ " order by article.createDts DESC LIMIT " + maxResults;
		} else {
			query = "select from AttributeCode where  " + activeStatusQuery
					+ " article is not null "
					+ " order by article.createDts DESC";
		}

		Map<String, Object> parameters = new HashMap<>();
		if (StringUtils.isNotBlank(activeStatus)) {
			parameters.put("activeStatusParam", activeStatus);
		}

		return persistenceService.query(query, parameters);
	}

	@Override
	public Architecture generateArchitecture(String attributeType)
	{
		Architecture architecture = new Architecture();

		AttributeType attributeTypeFull = persistenceService.findById(AttributeType.class, attributeType);
		if (attributeTypeFull != null) {
			if (attributeTypeFull.getArchitectureFlg()) {
				architecture.setName(attributeTypeFull.getDescription());
				architecture.setAttributeType(attributeType);

				String rootCode = "0";
				List<AttributeCode> attributeCodes = findCodesForType(attributeType);
				for (AttributeCode attributeCode : attributeCodes) {
					if (rootCode.equals(attributeCode.adjustedArchitectureCode())) {
						architecture.setAttributeCode(attributeCode.adjustedArchitectureCode());
						architecture.setDescription(attributeCode.getDescription());
					} else {
						String codeTokens[] = attributeCode.adjustedArchitectureCode().split(Pattern.quote("."));
						Architecture rootArchtecture = architecture;
						StringBuilder codeKey = new StringBuilder();
						for (int i = 0; i < codeTokens.length - 1; i++) {
							codeKey.append(codeTokens[i]);

							//put in stubs as needed
							boolean found = false;
							for (Architecture child : rootArchtecture.getChildren()) {
								if (child.getAttributeCode().equals(codeKey.toString())) {
									found = true;
									rootArchtecture = child;
									break;
								}
							}
							if (!found) {
								Architecture newChild = new Architecture();
								newChild.setAttributeCode(codeKey.toString());
								newChild.setAttributeType(attributeType);
								rootArchtecture.getChildren().add(newChild);
								rootArchtecture = newChild;
							}
							codeKey.append(".");
						}
						//now find the correct postion and add/update
						boolean found = false;
						for (Architecture child : rootArchtecture.getChildren()) {
							if (child.getAttributeCode().equals(attributeCode.adjustedArchitectureCode())) {
								child.setName(attributeCode.getLabel());
								child.setDescription(attributeCode.getDescription());
								found = true;
							}
						}
						if (!found) {
							Architecture newChild = new Architecture();
							newChild.setAttributeCode(attributeCode.adjustedArchitectureCode());
							newChild.setOriginalAttributeCode(attributeCode.getAttributeCodePk().getAttributeCode());
							newChild.setArchitectureCode(attributeCode.getArchitectureCode());
							newChild.setSortOrder(attributeCode.getSortOrder());
							newChild.setAttributeType(attributeType);
							newChild.setName(attributeCode.getLabel());
							newChild.setDescription(attributeCode.getDescription());
							rootArchtecture.getChildren().add(newChild);
						}
					}
				}

			} else {
				throw new OpenStorefrontRuntimeException("Attribute Type is not an architecture: " + attributeType, "Make sure type is an architecture.");
			}
		} else {
			throw new OpenStorefrontRuntimeException("Unable to find attribute type: " + attributeType, "Check type code.");
		}
		sortArchitecture(architecture.getChildren());
		return architecture;
	}

	private void sortArchitecture(List<Architecture> architectures)
	{
		if (architectures.isEmpty()) {
			return;
		}

		for (Architecture architecture : architectures) {
			sortArchitecture(architecture.getChildren());
		}
		architectures.sort(new ArchitectureComparator<>());
	}

	@Override
	public void addArticleTrackEvent(ArticleTracking articleTracking)
	{
		articleTracking.setArticleTrackingId(persistenceService.generateId());
		articleTracking.setActiveStatus(ArticleTracking.ACTIVE_STATUS);
		articleTracking.setCreateDts(TimeUtil.currentDate());
		articleTracking.setCreateUser(SecurityUtil.getCurrentUserName());
		articleTracking.setUpdateDts(TimeUtil.currentDate());
		articleTracking.setUpdateUser(SecurityUtil.getCurrentUserName());
		persistenceService.persist(articleTracking);
	}

	@Override
	public List<ComponentSearchView> getArticlesSearchView()
	{
		List<ComponentSearchView> list = new ArrayList<>();
		List<AttributeCode> codes = findRecentlyAddedArticles(null);
		codes.stream().forEach((code) -> {
			list.add(ComponentSearchView.toView(ArticleView.toView(code)));
		});
		return list;
	}

	@Override
	public List<ArticleView> getArticlesForCodeLike(AttributeCodePk attributeCodePk)
	{
		List<ArticleView> articles = new ArrayList<>();
		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeType(), "Type is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeCode(), "Code is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode == null) {
			AttributeCode attributeCodeExample = new AttributeCode();
			AttributeCodePk attributeCodePkExample = new AttributeCodePk();
			attributeCodePkExample.setAttributeType(attributeCodePk.getAttributeType());
			attributeCodeExample.setAttributeCodePk(attributeCodePkExample);
			attributeCodeExample.setArchitectureCode(attributeCodePk.getAttributeCode());

			attributeCode = persistenceService.queryOneByExample(AttributeCode.class, attributeCodeExample);
		}

		AttributeCode attributeCodeExample = new AttributeCode();
		AttributeCodePk attributeCodePkExample = new AttributeCodePk();
		attributeCodePkExample.setAttributeType(attributeCodePk.getAttributeType());
		attributeCodeExample.setAttributeCodePk(attributeCodePkExample);

		AttributeCode attributeCodeLikeExample = new AttributeCode();
		if (attributeCode != null && StringUtils.isNotBlank(attributeCode.getArchitectureCode())) {
			attributeCodeLikeExample.setArchitectureCode(attributeCode.getArchitectureCode() + "%");
		} else {
			AttributeCodePk attributeCodePkLikeExample = new AttributeCodePk();

			// get attribute codes by using LIKE sql construct 'value%'
			attributeCodePkLikeExample.setAttributeCode(attributeCodePk.getAttributeCode() + "%");
			attributeCodeLikeExample.setAttributeCodePk(attributeCodePkLikeExample);
		}

		QueryByExample queryByExample = new QueryByExample(attributeCodeExample);
		queryByExample.setLikeExample(attributeCodeLikeExample);
		List<AttributeCode> attributeCodes = persistenceService.queryByExample(AttributeCode.class, queryByExample);

		for (AttributeCode code : attributeCodes) {
			if (code.getArticle() != null) {
				articles.add(ArticleView.toView(code));
			}
		}
		return articles;
	}

	@Override
	public List<ArticleView> getArticles()
	{
		List<ArticleView> list = new ArrayList<>();
		List<AttributeCode> codes = findRecentlyAddedArticles(null);
		codes.stream().forEach((code) -> {
			ArticleView article = getArticle(code.getAttributeCodePk());
			list.add(article);
		});
		return list;
	}

	@Override
	public ArticleView getArticleView(AttributeCodePk attributeCodePk)
	{
		ArticleView article = null;

		Objects.requireNonNull(attributeCodePk, "AttributeCodePk is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeType(), "Type is required.");
		Objects.requireNonNull(attributeCodePk.getAttributeCode(), "Code is required.");

		AttributeCode attributeCode = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (attributeCode.getArticle() != null) {
			article = getArticle(attributeCodePk);
		}
		return article;
	}

	@Override
	public List<AttributeXRefType> getAttributeXrefTypes(AttributeXrefModel attributeXrefModel)
	{
		AttributeXRefType xrefAttributeTypeExample = new AttributeXRefType();
		xrefAttributeTypeExample.setActiveStatus(AttributeXRefType.ACTIVE_STATUS);
		xrefAttributeTypeExample.setIntegrationType(attributeXrefModel.getIntegrationType());
		xrefAttributeTypeExample.setProjectType(attributeXrefModel.getProjectKey());
		xrefAttributeTypeExample.setIssueType(attributeXrefModel.getIssueType());
		List<AttributeXRefType> xrefAttributeTypes = persistenceService.queryByExample(AttributeXRefType.class, xrefAttributeTypeExample);
		return xrefAttributeTypes;
	}

	@Override
	public Map<String, Map<String, String>> getAttributeXrefMapFieldMap()
	{
		Map<String, Map<String, String>> attributeCodeMap = new HashMap<>();

		AttributeXRefMap xrefAttributeMapExample = new AttributeXRefMap();
		xrefAttributeMapExample.setActiveStatus(AttributeXRefMap.ACTIVE_STATUS);

		List<AttributeXRefMap> xrefAttributeMaps = persistenceService.queryByExample(AttributeXRefMap.class, xrefAttributeMapExample);
		for (AttributeXRefMap xrefAttributeMap : xrefAttributeMaps) {

			if (attributeCodeMap.containsKey(xrefAttributeMap.getAttributeType())) {
				Map<String, String> codeMap = attributeCodeMap.get(xrefAttributeMap.getAttributeType());
				if (codeMap.containsKey(xrefAttributeMap.getExternalCode())) {

					//should only have one external code if there's a dup we'll only use one.
					//(however, which  code  is used depends on the order that came in.  which is not  determinate)
					//First one we hit wins
					log.log(Level.WARNING, MessageFormat.format("Duplicate external code for attribute type: {0} Code: {1}", new Object[]{xrefAttributeMap.getAttributeType(), xrefAttributeMap.getExternalCode()}));
				} else {
					codeMap.put(xrefAttributeMap.getExternalCode(), xrefAttributeMap.getLocalCode());
				}
			} else {
				Map<String, String> codeMap = new HashMap<>();
				codeMap.put(xrefAttributeMap.getExternalCode(), xrefAttributeMap.getLocalCode());
				attributeCodeMap.put(xrefAttributeMap.getAttributeType(), codeMap);
			}
		}

		return attributeCodeMap;
	}

	@Override
	public void saveAttributeXrefMap(AttributeXRefView attributeXRefView)
	{
		AttributeXRefType type = persistenceService.findById(AttributeXRefType.class, attributeXRefView.getType().getAttributeType());
		if (type != null) {
			type.setAttributeType(attributeXRefView.getType().getAttributeType());
			type.setActiveStatus(attributeXRefView.getType().getActiveStatus());
			type.setFieldId(attributeXRefView.getType().getFieldId());
			type.setFieldName(attributeXRefView.getType().getFieldName());
			type.setIntegrationType(attributeXRefView.getType().getIntegrationType());
			type.setIssueType(attributeXRefView.getType().getIssueType());
			type.setProjectType(attributeXRefView.getType().getProjectType());
			persistenceService.persist(type);
			AttributeXRefMap mapTemp = new AttributeXRefMap();
			mapTemp.setAttributeType(type.getAttributeType());
			List<AttributeXRefMap> tempMaps = persistenceService.queryByExample(AttributeXRefMap.class, new QueryByExample(mapTemp));
			for (AttributeXRefMap tempMap : tempMaps) {
				mapTemp = persistenceService.findById(AttributeXRefMap.class, tempMap.getXrefId());
				persistenceService.delete(mapTemp);
			}

			for (AttributeXRefMap map : attributeXRefView.getMap()) {
				AttributeXRefMap temp = persistenceService.queryOneByExample(AttributeXRefMap.class, map);
				if (temp != null) {
					temp.setActiveStatus(map.getActiveStatus());
					temp.setAttributeType(map.getAttributeType());
					temp.setExternalCode(map.getExternalCode());
					temp.setLocalCode(map.getLocalCode());
					persistenceService.persist(temp);
				} else {
					map.setActiveStatus(AttributeXRefMap.ACTIVE_STATUS);
					map.setXrefId(persistenceService.generateId());
					persistenceService.persist(map);
				}
			}
		} else {
			attributeXRefView.getType().setActiveStatus(AttributeXRefType.ACTIVE_STATUS);
			persistenceService.persist(attributeXRefView.getType());
			for (AttributeXRefMap map : attributeXRefView.getMap()) {
				map.setActiveStatus(AttributeXRefMap.ACTIVE_STATUS);
				map.setXrefId(persistenceService.generateId());
				persistenceService.persist(map);
			}
		}

	}

	@Override
	public void deleteAttributeXrefType(String attributeType)
	{
		AttributeXRefMap example = new AttributeXRefMap();
		example.setAttributeType(attributeType);
		persistenceService.deleteByExample(example);

		AttributeXRefType attributeXRefType = persistenceService.findById(AttributeXRefType.class, attributeType);
		if (attributeXRefType != null) {
			persistenceService.delete(attributeXRefType);
		}
	}

	@Override
	public void activateAttributeType(String type)
	{
		AttributeType attributeType = persistenceService.findById(AttributeType.class, type);

		if (attributeType != null) {
			attributeType.setActiveStatus(AttributeType.ACTIVE_STATUS);
			attributeType.setUpdateDts(TimeUtil.currentDate());
			attributeType.setUpdateUser(SecurityUtil.getCurrentUserName());
			persistenceService.persist(attributeType);

			BulkComponentAttributeChange bulkComponentAttributeChange = new BulkComponentAttributeChange();
			bulkComponentAttributeChange.setAttributes(getComponentAttributes(type, null));
			bulkComponentAttributeChange.setOpertionType(BulkComponentAttributeChange.OpertionType.ACTIVATE);
			(new ComponentServiceImpl(persistenceService)).bulkComponentAttributeChange(bulkComponentAttributeChange);

			cleanCaches(type);
		} else {
			throw new OpenStorefrontRuntimeException("Unable to save sort order.  Attribute Type: " + type, "Check data");
		}
	}

	@Override
	public void saveAttributeCodeSortOrder(AttributeCodePk attributeCodePk, Integer sortOrder)
	{
		Objects.requireNonNull(attributeCodePk, "Attribute Code PK is required");
		AttributeCode code = persistenceService.findById(AttributeCode.class, attributeCodePk);
		if (code != null) {
			code.setSortOrder(sortOrder);
			persistenceService.persist(code);

			cleanCaches(attributeCodePk.getAttributeType());
		} else {
			throw new OpenStorefrontRuntimeException("Unable to save sort order.  Attribute code: " + attributeCodePk.toString(), "Check data");
		}
	}

	@Override
	public List<AttributeCode> getArticles(Boolean all)
	{
		List<AttributeCode> attributeCodes;
		if (all) {
			attributeCodes = findRecentlyAddedArticles(null, null);
		} else {
			attributeCodes = findRecentlyAddedArticles(null, AttributeCode.ACTIVE_STATUS);
		}
		return attributeCodes;
	}

	@Override
	public ArticleTrackingResult getAttributeTracking(FilterQueryParams filter, AttributeCodePk attributeCodePk)
	{
		ArticleTrackingResult result = new ArticleTrackingResult();

		ArticleTracking articleTrackingExample = new ArticleTracking();
		articleTrackingExample.setActiveStatus(filter.getStatus());
		if (attributeCodePk != null) {
			articleTrackingExample.setAttributeCode(attributeCodePk.getAttributeCode());
			articleTrackingExample.setAttributeType(attributeCodePk.getAttributeType());
		}

		ArticleTracking articleTrackingStartExample = new ArticleTracking();
		articleTrackingStartExample.setEventDts(filter.getStart());

		ArticleTracking articleTrackingEndExample = new ArticleTracking();
		articleTrackingEndExample.setEventDts(filter.getEnd());

		QueryByExample queryByExample = new QueryByExample(articleTrackingExample);

		SpecialOperatorModel specialOperatorModel = new SpecialOperatorModel();
		specialOperatorModel.setExample(articleTrackingStartExample);
		specialOperatorModel.getGenerateStatementOption().setOperation(GenerateStatementOption.OPERATION_GREATER_THAN);
		queryByExample.getExtraWhereCauses().add(specialOperatorModel);

		specialOperatorModel = new SpecialOperatorModel();
		specialOperatorModel.setExample(articleTrackingEndExample);
		specialOperatorModel.getGenerateStatementOption().setOperation(GenerateStatementOption.OPERATION_LESS_THAN_EQUAL);
		specialOperatorModel.getGenerateStatementOption().setParameterSuffix(GenerateStatementOption.PARAMETER_SUFFIX_END_RANGE);
		queryByExample.getExtraWhereCauses().add(specialOperatorModel);

		queryByExample.setMaxResults(filter.getMax());
		queryByExample.setFirstResult(filter.getOffset());
		queryByExample.setSortDirection(filter.getSortOrder());

		ArticleTracking articleTrackingTrackingOrderExample = new ArticleTracking();
		Field sortField = ReflectionUtil.getField(articleTrackingTrackingOrderExample, filter.getSortField());
		if (sortField != null) {
			try {
				BeanUtils.setProperty(articleTrackingTrackingOrderExample, sortField.getName(), QueryByExample.getFlagForType(sortField.getType()));
			} catch (IllegalAccessException | InvocationTargetException ex) {
				log.log(Level.WARNING, "Unable to set sort field", ex);
			}
			queryByExample.setOrderBy(articleTrackingTrackingOrderExample);
		}

		List<ArticleTracking> articleTrackings = persistenceService.queryByExample(ArticleTracking.class, queryByExample);

		List<AttributeCode> codes = getArticles(Boolean.TRUE);
		Map<AttributeCodePk, Article> codeMap = new HashMap<>();
		codes.stream().forEach((code) -> {
			codeMap.put(code.getAttributeCodePk(), code.getArticle());
		});
		for (ArticleTracking item : articleTrackings) {
			ArticleTrackingCompleteWrapper wrapper = new ArticleTrackingCompleteWrapper();

			AttributeCodePk newPk = new AttributeCodePk();
			newPk.setAttributeCode(item.getAttributeCode());
			newPk.setAttributeType(item.getAttributeType());

			wrapper.setData(item);
			wrapper.setArticle(codeMap.get(newPk));
			result.getResult().add(wrapper);
		}

		if (filter.getSortField().equals(ArticleTrackingCompleteWrapper.FIELD_TITLE)) {
			if (filter.getSortOrder().equals(OpenStorefrontConstant.SORT_DESCENDING)) {
				result.getResult().sort((ArticleTrackingCompleteWrapper p1, ArticleTrackingCompleteWrapper p2) -> p1.getArticle().getTitle().compareToIgnoreCase(p2.getArticle().getTitle()));
			} else {
				result.getResult().sort((ArticleTrackingCompleteWrapper p1, ArticleTrackingCompleteWrapper p2) -> p2.getArticle().getTitle().compareToIgnoreCase(p1.getArticle().getTitle()));
			}
		}
		queryByExample.setQueryType(QueryType.COUNT);
		result.setCount(persistenceService.countByExample(queryByExample));

		return result;
	}

	@Override
	public void importArticles(List<ArticleView> articles)
	{
		articles.forEach(this::saveArticle);
	}

	@Override
	public AttributeTypeWrapper getFilteredTypes(FilterQueryParams filter)
	{
		AttributeTypeWrapper result = new AttributeTypeWrapper();

		AttributeType attributeExample = new AttributeType();
		if (filter.getAll() == null || filter.getAll() == false) {
			attributeExample.setActiveStatus(filter.getStatus());
		}

		QueryByExample queryByExample = new QueryByExample(attributeExample);

		queryByExample.setMaxResults(filter.getMax());
		queryByExample.setFirstResult(filter.getOffset());
		queryByExample.setSortDirection(filter.getSortOrder());

		AttributeType attributeOrderExample = new AttributeType();
		Field sortField = ReflectionUtil.getField(attributeOrderExample, filter.getSortField());
		if (sortField != null) {
			try {
				BeanUtils.setProperty(attributeOrderExample, sortField.getName(), QueryByExample.getFlagForType(sortField.getType()));
			} catch (IllegalAccessException | InvocationTargetException ex) {
				log.log(Level.WARNING, "Unable to set sort field", ex);
			}
			queryByExample.setOrderBy(attributeOrderExample);
		}

		List<AttributeType> attributes = persistenceService.queryByExample(AttributeType.class, queryByExample);

		result.setData(attributes);

		queryByExample.setQueryType(QueryType.COUNT);
		result.setTotalNumber(persistenceService.countByExample(queryByExample));
		return result;
	}

	@Override
	public AttributeCodeWrapper getFilteredCodes(FilterQueryParams filter, String type)
	{
		AttributeCodeWrapper result = new AttributeCodeWrapper();
		AttributeCodePk pk = new AttributeCodePk();
		pk.setAttributeType(type);
		AttributeCode attributeExample = new AttributeCode();
		attributeExample.setAttributeCodePk(pk);
		attributeExample.setActiveStatus(filter.getStatus());

		QueryByExample queryByExample = new QueryByExample(attributeExample);

		queryByExample.setMaxResults(filter.getMax());
		queryByExample.setFirstResult(filter.getOffset());
		queryByExample.setSortDirection(filter.getSortOrder());

		AttributeCode attributeOrderExample = new AttributeCode();
		if (filter.getSortField().equals("code")) {
			AttributeCodePk newPk = new AttributeCodePk();
			newPk.setAttributeCode(QueryByExample.STRING_FLAG);
			attributeOrderExample.setAttributeCodePk(newPk);
			queryByExample.setOrderBy(attributeOrderExample);
		} else {

			Field sortField = ReflectionUtil.getField(attributeOrderExample, filter.getSortField());
			if (sortField != null) {
				try {
					BeanUtils.setProperty(attributeOrderExample, sortField.getName(), QueryByExample.getFlagForType(sortField.getType()));
				} catch (IllegalAccessException | InvocationTargetException ex) {
					log.log(Level.WARNING, "Unable to set sort field", ex);
				}
				queryByExample.setOrderBy(attributeOrderExample);
			}
		}

		List<AttributeCode> attributes = persistenceService.queryByExample(AttributeCode.class, queryByExample);
		List<AttributeCodeView> views = AttributeCodeView.toViews(attributes);

		result.setData(views);

		queryByExample.setQueryType(QueryType.COUNT);
		result.setTotalNumber(persistenceService.countByExample(queryByExample));
		return result;
	}

	@Override
	public void changeAttributeCode(AttributeCodePk attributeCodePk, String newCode)
	{

		ArticleTracking trackingExample = new ArticleTracking();
		trackingExample.setAttributeType(attributeCodePk.getAttributeType());
		trackingExample.setAttributeCode(attributeCodePk.getAttributeCode());

		ArticleTracking trackingUpdateExample = new ArticleTracking();
		trackingUpdateExample.setAttributeCode(newCode);
		persistenceService.updateByExample(ArticleTracking.class, trackingUpdateExample, trackingExample);

		String query = "Update " + ComponentAttributePk.class.getSimpleName() + " set attributeCode = :attributeCodeParamReplace where attributeCode = :oldCodeParam and attributeType = :attributeTypeParam";
		Map<String, Object> parameters = new HashMap<>();
		parameters.put("attributeCodeParamReplace", newCode);
		parameters.put("oldCodeParam", attributeCodePk.getAttributeCode());
		parameters.put("attributeTypeParam", attributeCodePk.getAttributeType());

		persistenceService.runDbCommand(query, parameters);

		query = "Update " + AttributeCodePk.class.getSimpleName() + " set attributeCode = :attributeCodeParamReplace where attributeCode = :oldCodeParam and attributeType = :attributeTypeParam";
		parameters = new HashMap<>();
		parameters.put("attributeCodeParamReplace", newCode);
		parameters.put("oldCodeParam", attributeCodePk.getAttributeCode());
		parameters.put("attributeTypeParam", attributeCodePk.getAttributeType());

		persistenceService.runDbCommand(query, parameters);

		cleanCaches(attributeCodePk.getAttributeType());
	}

}
