// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { cloneDeep, filter, forEach, isEmpty, join, map } from 'lodash';
import { watch, Ref, ref } from 'vue';
import { FeedProperty, XmlPropertyContainer } from '../types';

/**
 * An interface for working with xml properties from an xml feed
 */
export interface UseXmlProperties {

    /**
     * Correctly formats and exports the current properties
     */
    getCurrentProperties(): FeedProperty[] | undefined;

    /**
     * Gets the current properties as xml
     */
    getXml(): string | undefined;

    /**
     * Saves properties values from a json string
     * @param json The property json to parse
     * @returns True if the json was parsed and saved, false otherwise
     */
    saveJson: (json: string | undefined) => boolean;

    /**
     * Gets a copy of the current properties
    */
    getModel(): FeedProperty[] | undefined;

    /**
     * Manually adds an array of properties to the current properties
     */
    addProperties: (properties: FeedProperty[]) => void;
}

/**
 * Creates a new instance of the useXmlProperties api from the given feed
 * @param feed The feed to read and watch for changes from
 * @returns An api for working with xml properties
 */
export const useXmlProperties = <T extends XmlPropertyContainer>(feed: Ref<T | undefined>): UseXmlProperties => {

    //The current properties
    const currentProperties = ref<FeedProperty[]>(feed.value?.properties || []);

    //Watch for changes to the feed
    watch(feed, (newFeed) => { currentProperties.value = newFeed?.properties || [] }, { immediate: true });

    const getCurrentProperties = (): FeedProperty[] | undefined => {
        //Get all properties that are not emtpy
        return filter(currentProperties.value, p => !isEmpty(p.name));
    }

    const getPropertyXml = (properties: FeedProperty[]): string => {
        let output = '';
        forEach(properties, prop => {
            //Open tag (with namespace if present)
            output += !isEmpty(prop.namespace) ? `<${prop.namespace}:${prop.name}` : `<${prop.name}`

            if (!isEmpty(prop.attributes)) {
                forEach(prop.attributes, (value, key) => output += ` ${key}="${value}"`)
            }

            //Recursive call for nested property, or add its value
            output += !isEmpty(prop.properties) ? `>${getPropertyXml(prop.properties!)}` : `>${prop.value || ''}`

            //Close tag
            output += !isEmpty(prop.namespace) ? `</${prop.namespace}:${prop.name}>` : `</${prop.name}>`
            return output;
        })
        return output;
    }

    const getModel = (): FeedProperty[] | undefined => {
        return cloneDeep(currentProperties.value);
    }

    const getXml = (): string => {
        if (currentProperties.value === undefined) {
            return '';
        }
        return join(map(currentProperties.value, p => getPropertyXml([p])), '\n');
    }

    const saveJson = (json: string | undefined): boolean => {

        if (isEmpty(json)) {
            //Clear all properties if json is undefined
            currentProperties.value = [];
            return true
        }

        try {
            const parsed = JSON.parse(json!);

            const props = map(parsed, (prop) => ({
                name: prop.name,
                value: prop.value,
                namespace: prop.namespace,
                attributes: prop.attributes,
                properties: prop.properties
            }))

            //Remove any empty properties
            const nonEmpty = filter(props, p => !isEmpty(p.name));

            //Set the properties
            currentProperties.value = nonEmpty;

            return true;
        } catch (err) {
            return false;
        }
    }

    const addProperties = (properties: FeedProperty[]) => {
        currentProperties.value = [...currentProperties.value, ...properties];
    }

    return {
        getCurrentProperties,
        getXml,
        saveJson,
        getModel,
        addProperties
    }
}