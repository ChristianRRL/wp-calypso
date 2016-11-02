/**
 * External dependencies
 */
import React, { Component } from 'react';
import page from 'page';
import { omit } from 'lodash';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';
import debugFactory from 'debug';

/**
 * Internal dependencies
 */
import Card from 'components/card';
import CompactCard from 'components/card/compact';
import Button from 'components/button';
import RelatedContentPreview from 'my-sites/site-settings/related-content-preview';
import LanguageSelector from 'components/forms/language-selector';
import DisconnectJetpackButton from 'my-sites/plugins/disconnect-jetpack/disconnect-jetpack-button';
import SectionHeader from 'components/section-header';
import config from 'config';
import { protectForm } from 'lib/protect-form';
import notices from 'notices';
import analytics from 'lib/analytics';
import formFields from 'components/hoc/form-fields';
import Gridicon from 'components/gridicon';
import FormInput from 'components/forms/form-text-input';
import FormFieldset from 'components/forms/form-fieldset';
import FormLabel from 'components/forms/form-label';
import FormRadio from 'components/forms/form-radio';
import FormCheckbox from 'components/forms/form-checkbox';
import FormToggle from 'components/forms/form-toggle';
import FormSettingExplanation from 'components/forms/form-setting-explanation';
import Timezone from 'components/timezone';
import JetpackSyncPanel from './jetpack-sync-panel';
import SiteIconSetting from './site-icon-setting';
import UpgradeNudge from 'my-sites/upgrade-nudge';
import { isBusiness } from 'lib/products-values';
import { FEATURE_NO_BRANDING } from 'lib/plans/constants';
import { isRequestingSiteSettings, isSavingSiteSettings, getSiteSettings } from 'state/site-settings/selectors';
import { saveSiteSettings } from 'state/site-settings/actions';
import { clearNotices } from 'state/notices/actions';
import QuerySiteSettings from 'components/data/query-site-settings';

const debug = debugFactory( 'calypso:my-sites:site-settings' );

class SiteSettingsFormGeneral extends Component {
	state = {};

	getFormSettings( settings ) {
		if ( ! settings ) {
			return {};
		}

		const formSettings = {
			blogname: settings.blogname,
			blogdescription: settings.blogdescription,

			lang_id: settings.lang_id,
			blog_public: settings.blog_public,
			timezone_string: settings.timezone_string,
			jetpack_relatedposts_allowed: settings.jetpack_relatedposts_allowed,
			jetpack_sync_non_public_post_stati: settings.jetpack_sync_non_public_post_stati,

			amp_is_supported: settings.amp_is_supported,
			amp_is_enabled: settings.amp_is_enabled
		};

		if ( settings.jetpack_relatedposts_allowed ) {
			formSettings.jetpack_relatedposts_enabled = ( settings.jetpack_relatedposts_enabled ) ? 1 : 0;
			formSettings.jetpack_relatedposts_show_headline = settings.jetpack_relatedposts_show_headline;
			formSettings.jetpack_relatedposts_show_thumbnails = settings.jetpack_relatedposts_show_thumbnails;
		}

		if ( settings.holidaysnow ) {
			formSettings.holidaysnow = settings.holidaysnow;
		}

		// handling `gmt_offset` and `timezone_string` values
		const gmt_offset = settings.gmt_offset;

		if (
			! settings.timezone_string &&
			typeof gmt_offset === 'string' &&
			gmt_offset.length
		) {
			formSettings.timezone_string = 'UTC' +
				( /\-/.test( gmt_offset ) ? '' : '+' ) +
				gmt_offset;
		}

		return formSettings;
	}

	componentWillMount() {
		this._showWarning( this.props.site );
		this.props.updateFields( {
			fetchingSettings: true,
			blogname: '',
			blogdescription: '',
			lang_id: '',
			timezone_string: '',
			blog_public: '',
			admin_url: '',
			jetpack_relatedposts_allowed: false,
			jetpack_relatedposts_enabled: false,
			jetpack_relatedposts_show_headline: false,
			jetpack_relatedposts_show_thumbnails: false,
			jetpack_sync_non_public_post_stati: false,
			holidaysnow: false,
			amp_is_supported: false,
			amp_is_enabled: false,
		} );
		this.props.clearDirtyFields();
		this.props.updateFields( this.getFormSettings( this.props.settings ) );
	}

	componentWillReceiveProps( nextProps ) {
		this._showWarning( nextProps.site );

		if ( nextProps.settings !== this.props.settings ) {
			let newState = this.getFormSettings( nextProps.settings );
			//If we have any fields that the user has updated,
			//do not wipe out those fields from the poll update.
			newState = omit( newState, nextProps.dirtyFields );
			return nextProps.updateFields( newState );
		}
	}

	onRecordEvent( eventAction ) {
		return this.recordEvent.bind( this, eventAction );
	}

	onRecordEventOnce( key, eventAction ) {
		return this.recordEventOnce.bind( this, key, eventAction );
	}

	recordEvent( eventAction ) {
		debug( 'record event: %o', eventAction );
		analytics.ga.recordEvent( 'Site Settings', eventAction );
	}

	/**
	 * Record an analytics event only once per mounted component instance
	 * @param  {string} key         - unique key to namespace the event
	 * @param  {string} eventAction - the description of the action to appear in analytics
	 */
	recordEventOnce( key, eventAction ) {
		debug( 'record event once: %o - %o', key, eventAction );
		if ( this.state[ 'recordEventOnce-' + key ] ) {
			return;
		}
		this.recordEvent( eventAction );
		this.setState( { [ 'recordEventOnce-' + key ]: true } );
	}

	handleRadio = event => {
		const currentTargetName = event.currentTarget.name,
			currentTargetValue = event.currentTarget.value;

		this.props.updateFields( { [ currentTargetName ]: currentTargetValue } );
	};

	handleSubmitForm = event => {
		if ( ! event.isDefaultPrevented() && event.nativeEvent ) {
			event.preventDefault();
		}

		this.submitForm();
		this.recordEvent( 'Clicked Save Settings Button' );
	};

	submitForm() {
		const { fields, site, clearDirtyFields } = this.props;
		this.props.clearNotices();
		this.props.saveSiteSettings( site.ID, fields )
			.then( () => {
				clearDirtyFields();
				this.props.markSaved();
			} );
	}

	onChangeField( field ) {
		return event => {
			const { updateFields } = this.props;
			updateFields( {
				[ field ]: event.target.value
			} );
		};
	}

	onTimezoneSelect = timezone => {
		this.props.updateFields( {
			timezone_string: timezone
		} );
	};

	siteOptions() {
		const { translate, isRequestingSettings, fields } = this.props;

		return (
			<div>
				<FormFieldset>
					<FormLabel htmlFor="blogname">{ translate( 'Site Title' ) }</FormLabel>
					<FormInput
						name="blogname"
						id="blogname"
						type="text"
						value={ fields.blogname || '' }
						onChange={ this.onChangeField( 'blogname' ) }
						disabled={ isRequestingSettings }
						onClick={ this.onRecordEvent( 'Clicked Site Title Field' ) }
						onKeyPress={ this.onRecordEventOnce( 'typedTitle', 'Typed in Site Title Field' ) } />
				</FormFieldset>
				<FormFieldset>
					<FormLabel htmlFor="blogdescription">{ translate( 'Site Tagline' ) }</FormLabel>
					<FormInput
						name="blogdescription"
						type="text"
						id="blogdescription"
						value={ fields.blogdescription || '' }
						onChange={ this.onChangeField( 'blogdescription' ) }
						disabled={ isRequestingSettings }
						onClick={ this.onRecordEvent( 'Clicked Site Site Tagline Field' ) }
						onKeyPress={ this.onRecordEventOnce( 'typedTagline', 'Typed in Site Site Tagline Field' ) } />
					<FormSettingExplanation>
						{ translate( 'In a few words, explain what this site is about.' ) }
					</FormSettingExplanation>
				</FormFieldset>
				<SiteIconSetting />
			</div>
		);
	}

	blogAddress() {
		const { site, translate } = this.props;
		let customAddress = '',
			addressDescription = '';

		if ( site.jetpack ) {
			return null;
		}

		if ( config.isEnabled( 'upgrades/domain-search' ) ) {
			customAddress = (
				<Button href={ '/domains/add/' + site.slug } onClick={ this.trackUpgradeClick }>
					<Gridicon icon="plus" /> { translate( 'Add a Custom Address', { context: 'Site address, domain' } ) }
				</Button>
			);

			addressDescription =
				<FormSettingExplanation>
					{
						translate(
							'Buy a {{domainSearchLink}}custom domain{{/domainSearchLink}}, ' +
							'{{mapDomainLink}}map{{/mapDomainLink}} a domain you already own, ' +
							'or {{redirectLink}}redirect{{/redirectLink}} this site.',
							{
								components: {
									domainSearchLink: (
										<a href={ '/domains/add/' + site.slug } onClick={ this.trackUpgradeClick } />
									),
									mapDomainLink: (
										<a href={ '/domains/add/mapping/' + site.slug } onClick={ this.trackUpgradeClick } />
									),
									redirectLink: (
										<a href={ '/domains/add/site-redirect/' + site.slug } onClick={ this.trackUpgradeClick } />
									)
								}
							}
						)
					}
				</FormSettingExplanation>;
		}

		return (
			<FormFieldset className="site-settings__has-divider">
				<FormLabel htmlFor="blogaddress">{ translate( 'Site Address' ) }</FormLabel>
				<div className="site-settings__blogaddress-settings">
					<FormInput
						name="blogaddress"
						type="text"
						id="blogaddress"
						value={ site.domain }
						disabled="disabled" />
					{ customAddress }
				</div>
				{ addressDescription }
			</FormFieldset>
		);
	}

	trackUpgradeClick = () => {
		analytics.tracks.recordEvent( 'calypso_upgrade_nudge_cta_click', { cta_name: 'settings_site_address' } );
	};

	languageOptions() {
		const { fields, isRequestingSettings, site, translate } = this.props;
		if ( site.jetpack ) {
			return null;
		}
		return (
			<FormFieldset>
				<FormLabel htmlFor="lang_id">{ translate( 'Language' ) }</FormLabel>
				<LanguageSelector
					name="lang_id"
					id="lang_id"
					languages={ config( 'languages' ) }
					value={ fields.lang_id }
					onChange={ this.onChangeField( 'lang_id' ) }
					disabled={ isRequestingSettings }
					onClick={ this.onRecordEvent( 'Clicked Language Field' ) } />
				<FormSettingExplanation>
					{ translate( 'Language this blog is primarily written in.' ) }&nbsp;
					<a href={ config.isEnabled( 'me/account' ) ? '/me/account' : '/settings/account/' }>
						{ translate( 'You can also modify the interface language in your profile.' ) }
					</a>
				</FormSettingExplanation>
			</FormFieldset>
		);
	}

	visibilityOptions() {
		const { fields, isRequestingSettings, site, translate } = this.props;

		return (
			<FormFieldset>
				<FormLabel>
					<FormRadio
						name="blog_public"
						value="1"
						checked={ 1 === parseInt( fields.blog_public, 10 ) }
						onChange={ this.handleRadio }
						disabled={ isRequestingSettings }
						onClick={ this.onRecordEvent( 'Clicked Site Visibility Radio Button' ) } />
					<span>{ translate( 'Public' ) }</span>
					<FormSettingExplanation isIndented>
						{ translate( 'Your site is visible to everyone, and it may be indexed by search engines.' ) }
					</FormSettingExplanation>
				</FormLabel>

				<FormLabel>
					<FormRadio
						name="blog_public"
						value="0"
						checked={ 0 === parseInt( fields.blog_public, 10 ) }
						onChange={ this.handleRadio }
						disabled={ isRequestingSettings }
						onClick={ this.onRecordEvent( 'Clicked Site Visibility Radio Button' ) } />
					<span>{ translate( 'Hidden' ) }</span>
					<FormSettingExplanation isIndented>
						{ translate( 'Your site is visible to everyone, but we ask search engines to not index your site.' ) }
					</FormSettingExplanation>
				</FormLabel>

				{ ! site.jetpack &&
					<FormLabel>
						<FormRadio
							name="blog_public"
							value="-1"
							checked={ -1 === parseInt( fields.blog_public, 10 ) }
							onChange={ this.handleRadio }
							disabled={ isRequestingSettings }
							onClick={ this.onRecordEvent( 'Clicked Site Visibility Radio Button' ) } />
						<span>{ translate( 'Private' ) }</span>
						<FormSettingExplanation isIndented>
							{ translate( 'Your site is only visible to you and users you approve.' ) }
						</FormSettingExplanation>
					</FormLabel>
				}

			</FormFieldset>
		);
	}

	handleAmpToggle = () => {
		const { fields, updateFields } = this.props;
		updateFields( { amp_is_enabled: ! fields.amp_is_enabled }, () => {
			this.submitForm();
			this.onRecordEvent( 'Clicked AMP Toggle' );
		} );
	};

	handleAmpCustomize = () => {
		this.onRecordEvent( 'Clicked AMP Customize button' );
		page( '/customize/amp/' + this.props.site.slug );
	};

	renderAmpSection() {
		if ( this.props.site.jetpack ) {
			return;
		}

		const {
			fields: {
				amp_is_supported,
				amp_is_enabled
			},
			isRequestingSettings,
			isSavingSettings,
			translate
		} = this.props;

		const isDisabled = isRequestingSettings || isSavingSettings;
		const isCustomizeDisabled = isDisabled || ! amp_is_enabled;

		if ( ! amp_is_supported ) {
			return null;
		}

		return (
			<div className="site-settings__amp">
				<SectionHeader label={ translate( 'AMP' ) }>
					<Button
						compact
						disabled={ isCustomizeDisabled }
						onClick={ this.handleAmpCustomize }>
						{ translate( 'Edit Design' ) }
					</Button>
					<FormToggle
						checked={ amp_is_enabled }
						onChange={ this.handleAmpToggle }
						disabled={ isDisabled } />
				</SectionHeader>
				<Card className="site-settings__amp-explanation">
					<p>
						{ translate(
							'Your WordPress.com site supports {{a}}Accelerated Mobile Pages (AMP){{/a}}, ' +
							'a new Google-led initiative that dramatically improves loading speeds ' +
							'on phones and tablets. {{a}}Learn More{{/a}}.',
							{
								components: {
									a: <a
										href="https://support.wordpress.com/google-amp-accelerated-mobile-pages/"
										target="_blank" rel="noopener noreferrer" />
								}
							}
						) }
					</p>
				</Card>
			</div>
		);
	}

	relatedPostsOptions() {
		const { fields, translate } = this.props;
		if ( ! fields.jetpack_relatedposts_allowed ) {
			return null;
		}

		return (
			<FormFieldset>
				<ul id="settings-reading-relatedposts">
					<li>
						<FormLabel>
							<FormRadio
								name="jetpack_relatedposts_enabled"
								value="0"
								checked={ 0 === parseInt( fields.jetpack_relatedposts_enabled, 10 ) }
								onChange={ this.handleRadio }
								onClick={ this.onRecordEvent( 'Clicked Related Posts Radio Button' ) } />
							<span>{ translate( 'Hide related content after posts' ) }</span>
						</FormLabel>
					</li>
					<li>
						<FormLabel>
							<FormRadio
								name="jetpack_relatedposts_enabled"
								value="1"
								checked={ 1 === parseInt( fields.jetpack_relatedposts_enabled, 10 ) }
								onChange={ this.handleRadio }
								onClick={ this.onRecordEvent( 'Clicked Related Posts Radio Button' ) } />
							<span>{ translate( 'Show related content after posts' ) }</span>
						</FormLabel>
						<ul
							id="settings-reading-relatedposts-customize"
							className={ 1 === parseInt( fields.jetpack_relatedposts_enabled, 10 ) ? null : 'disabled-block' }>
							<li>
								<FormLabel>
									<FormCheckbox
										name="jetpack_relatedposts_show_headline"
										value={ fields.jetpack_relatedposts_show_headline }
										onChange={ this.onChangeField( 'jetpack_relatedposts_show_headline' ) } />
									<span>
										{ translate(
											'Show a "Related" header to more clearly separate the related section from posts'
										) }
									</span>
								</FormLabel>
							</li>
							<li>
								<FormLabel>
									<FormCheckbox
										name="jetpack_relatedposts_show_thumbnails"
										value={ fields.jetpack_relatedposts_show_thumbnails }
										onChange={ this.onChangeField( 'jetpack_relatedposts_show_thumbnails' ) } />
									<span>{ translate( 'Use a large and visually striking layout' ) }</span>
								</FormLabel>
							</li>
						</ul>
						<RelatedContentPreview
							enabled={ 1 === parseInt( fields.jetpack_relatedposts_enabled, 10 ) }
							showHeadline={ fields.jetpack_relatedposts_show_headline }
							showThumbnails={ fields.jetpack_relatedposts_show_thumbnails } />
					</li>
				</ul>
			</FormFieldset>
		);
	}

	showPublicPostTypesCheckbox() {
		if ( ! config.isEnabled( 'manage/option_sync_non_public_post_stati' ) ) {
			return false;
		}

		const { site } = this.props;
		if ( site.jetpack && site.versionCompare( '4.1.1', '>' ) ) {
			return false;
		}

		return true;
	}

	syncNonPublicPostTypes() {
		const { fields, translate } = this.props;
		if ( ! this.showPublicPostTypesCheckbox() ) {
			return null;
		}

		return (
			<CompactCard>
				<form onChange={ this.props.markChanged }>
					<ul id="settings-jetpack">
						<li>
							<FormLabel>
								<FormCheckbox
									name="jetpack_sync_non_public_post_stati"
									value={ fields.jetpack_sync_non_public_post_stati }
									onChange={ this.onChangeField( 'jetpack_sync_non_public_post_stati' ) }
								/>
								<span>{ translate( 'Allow synchronization of Posts and Pages with non-public post statuses' ) }</span>
								<FormSettingExplanation isIndented>
									{ translate( '(e.g. drafts, scheduled, private, etc\u2026)' ) }
								</FormSettingExplanation>
							</FormLabel>
						</li>
					</ul>
				</form>
			</CompactCard>
		);
	}

	jetpackDisconnectOption() {
		const { site, translate } = this.props;

		if ( ! site.jetpack ) {
			return null;
		}

		const disconnectText = translate( 'Disconnect Site', {
			context: 'Jetpack: Action user takes to disconnect Jetpack site from .com link in general site settings'
		} );

		return <DisconnectJetpackButton
				site={ site }
				text= { disconnectText }
				redirect= "/stats"
				linkDisplay={ false } />;
	}

	holidaySnowOption() {
		// Note that years and months below are zero indexed
		const { fields, moment, site, translate } = this.props,
			today = moment(),
			startDate = moment( { year: today.year(), month: 11, day: 1 } ),
			endDate = moment( { year: today.year(), month: 0, day: 4 } );

		if ( site.jetpack && site.versionCompare( '4.0', '<' ) ) {
			return null;
		}

		if ( today.isBefore( startDate, 'day' ) && today.isAfter( endDate, 'day' ) ) {
			return null;
		}

		return (
			<FormFieldset>
				<legend>{ translate( 'Holiday Snow' ) }</legend>
				<ul>
					<li>
						<FormLabel>
							<FormCheckbox name="holidaysnow"
								value={ fields.holidaysnow }
								onChange={ this.onChangeField( 'holidaysnow' ) }
							/>
							<span>{ translate( 'Show falling snow on my blog until January 4th.' ) }</span>
						</FormLabel>
					</li>
				</ul>
			</FormFieldset>
		);
	}

	Timezone() {
		const { fields, isRequestingSettings, site, translate } = this.props;
		if ( site.jetpack ) {
			return;
		}

		return (
			<FormFieldset>
				<FormLabel htmlFor="blogtimezone">
					{ translate( 'Site Timezone' ) }
				</FormLabel>

				<Timezone
					selectedZone={ fields.timezone_string }
					disabled={ isRequestingSettings }
					onSelect={ this.onTimezoneSelect }
				/>

				<FormSettingExplanation>
					{ translate( 'Choose a city in your timezone.' ) }
				</FormSettingExplanation>
			</FormFieldset>
		);
	}

	renderJetpackSyncPanel() {
		if ( ! config.isEnabled( 'jetpack/sync-panel' ) ) {
			return null;
		}

		const { site } = this.props;
		if ( ! site.jetpack || site.versionCompare( '4.2-alpha', '<' ) ) {
			return null;
		}

		return (
			<JetpackSyncPanel />
		);
	}

	render() {
		const { isRequestingSettings, isSavingSettings, site, translate } = this.props;
		if ( site.jetpack && ! site.hasMinimumJetpackVersion ) {
			return this.jetpackDisconnectOption();
		}

		return (
			<div className={ isRequestingSettings ? 'is-loading' : '' }>
				{ site && <QuerySiteSettings siteId={ site.ID } /> }
				<SectionHeader label={ translate( 'Site Profile' ) }>
					<Button
						compact={ true }
						onClick={ this.handleSubmitForm }
						primary={ true }

						type="submit"
						disabled={ isRequestingSettings || isSavingSettings }>
							{ isSavingSettings
								? translate( 'Saving…' )
								: translate( 'Save Settings' )
							}
					</Button>
				</SectionHeader>
				<Card>
					<form onChange={ this.props.markChanged }>
						{ this.siteOptions() }
						{ this.blogAddress() }
						{ this.languageOptions() }
						{ this.Timezone() }
						{ this.holidaySnowOption() }
					</form>
				</Card>

				<SectionHeader label={ translate( 'Privacy' ) }>
					<Button
						compact={ true }
						onClick={ this.handleSubmitForm }
						primary={ true }

						type="submit"
						disabled={ isRequestingSettings || isSavingSettings }>
							{ isSavingSettings
								? translate( 'Saving…' )
								: translate( 'Save Settings' )
							}
					</Button>
				</SectionHeader>
				<Card>
					<form onChange={ this.props.markChanged }>
						{ this.visibilityOptions() }
					</form>
				</Card>

				{ this.renderAmpSection() }

				{
					! site.jetpack && <div className="site-settings__footer-credit-container">
						<SectionHeader label={ translate( 'Footer Credit' ) } />
						<CompactCard className="site-settings__footer-credit-explanation">
							<p>
								{ translate( 'You can customize your website by changing the footer credit in customizer.' ) }
							</p>
							<div>
								<Button className="site-settings__footer-credit-change" href={ '/customize/identity/' + site.slug }>
									{ translate( 'Change footer credit' ) }
								</Button>
							</div>
						</CompactCard>
						{ ! isBusiness( site.plan ) && <UpgradeNudge
							className="site-settings__footer-credit-nudge"
							feature={ FEATURE_NO_BRANDING }
							title={ translate( 'Remove the footer credit entirely with WordPress.com Business' ) }
							message={ translate( 'Upgrade to remove the footer credit, add Google Analytics and more' ) }
							icon="customize"
						/> }
					</div>
				}
				<SectionHeader label={ translate( 'Related Posts' ) }>
					<Button
						compact={ true }
						onClick={ this.handleSubmitForm }
						primary={ true }

						type="submit"
						disabled={ isRequestingSettings || isSavingSettings }>
							{ isSavingSettings
								? translate( 'Saving…' )
								: translate( 'Save Settings' )
							}
					</Button>
				</SectionHeader>
				<Card>
					<form onChange={ this.props.markChanged }>
						{ this.relatedPostsOptions() }
					</form>
				</Card>

				{ this.props.site.jetpack
					? <div>
						<SectionHeader label={ translate( 'Jetpack' ) }>
							{ this.jetpackDisconnectOption() }
							{ this.showPublicPostTypesCheckbox()
								? <Button
									compact={ true }
									onClick={ this.handleSubmitForm }
									primary={ true }
									type="submit"
									disabled={ isRequestingSettings || isSavingSettings }>
									{ isSavingSettings
										? translate( 'Saving…' )
										: translate( 'Save Settings' )
									}
									</Button>
								: null
							}
						</SectionHeader>

						{ this.renderJetpackSyncPanel() }
						{ this.syncNonPublicPostTypes() }

						<CompactCard href={ '../security/' + site.slug }>
							{ translate( 'View Jetpack Monitor Settings' ) }
						</CompactCard>
						<CompactCard href={ 'https://wordpress.com/manage/' + site.ID }>
							{ translate( 'Migrate followers from another WordPress.com blog' ) }
						</CompactCard>
					</div>
					: null }
			</div>
		);
	}

	_showWarning( site ) {
		const { translate } = this.props;
		if ( ! site || ! site.options ) {
			return;
		}
		if ( site.jetpack && ! site.hasMinimumJetpackVersion ) {
			notices.warning(
				translate( 'Jetpack %(version)s is required to manage Settings', {
					args: { version: config( 'jetpack_min_version' ) }
				} ),
				{
					button: translate( 'Update now' ),
					href: site.options.admin_url + 'plugins.php?plugin_status=upgrade'
				}
			);
		}
	}
}

export default connect(
	( state, { site } ) => {
		const isRequestingSettings = site ? isRequestingSiteSettings( state, site.ID ) : false;
		const isSavingSettings = site ? isSavingSiteSettings( state, site.ID ) : false;
		const settings = site ? getSiteSettings( state, site.ID ) : null;
		return {
			isRequestingSettings, isSavingSettings, settings
		};
	},
	{ clearNotices, saveSiteSettings }
)( localize( formFields( protectForm( SiteSettingsFormGeneral ) ) ) );
