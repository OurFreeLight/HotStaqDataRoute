import { HotRoute, HotDBMySQL, HotAPI, ConnectionStatus, 
	HotStaq, HotTestDriver, HotServerType, ServerRequest } from "hotstaq";

/**
 * Data route.
 */
export class DataRoute extends HotRoute
{
	/**
	 * The database connection.
	 */
	db: HotDBMySQL;
	/**
	 * When inserting a new field, change any values. Returning 
	 * undefined will not insert the field.
	 */
	onInsertField: (schema: string, key: string, value: any) => any;
	/**
	 * When updating a new field, change any values. Returning 
	 * undefined will not insert the field.
	 */
	onUpdateField: (schema: string, key: string, value: any) => any;
	/**
	 * When updating a new field with a where field, change any values. Returning 
	 * undefined will not insert the field.
	 */
	onUpdateWhereField: (schema: string, key: string, value: any) => any;
	/**
	 * When removing a field, change any values. Returning 
	 * undefined will not include the field.
	 */
	onRemoveWhereField: (schema: string, key: string, value: any) => any;
	/**
	 * When listing a field, change any values. Returning 
	 * undefined will not list the field.
	 */
	onListWhereField: (schema: string, key: string, value: any) => any;
	/**
	 * When listing the results, change any values.
	 */
	onListFilterResults: (results: any) => any;

	/**
	 * @param api The API to attach this route to.
	 * @param onStartQueries The queries to execute when registering this route. This 
	 * would be executing any create if not exists tables, initial inserts, etc.
	 */
	constructor (api: HotAPI, onRegisteringRoute: ((db: HotDBMySQL) => Promise<void>) = null)
	{
		super (api.connection, "data");

		this.onInsertField = null;
		this.onUpdateField = null;
		this.onUpdateWhereField = null;
		this.onRemoveWhereField = null;
		this.onListWhereField = null;
		this.onListFilterResults = (results: any): any =>
			{
				for (let key in results)
				{
					const tempKey: string = key.toLowerCase ();

					if ((tempKey === "password") || (tempKey === "passwordSalt") ||
						(tempKey === "password_hash") || (tempKey === "password_salt") ||
						(tempKey === "passwordhash") || (tempKey === "passwordsalt") ||
						(tempKey === "apikey") || (tempKey === "api_key") ||
						(tempKey === "privatekey") || (tempKey === "private_key") ||
						(tempKey === "secretkey") || (tempKey === "secret_key"))
					{
						delete results[key];
					}
				}

				return (results);
			};

		this.onRegister = async () =>
			{
				if (api.connection.type !== HotServerType.Generate)
				{
					this.db = (<HotDBMySQL>this.connection.api.db);

					if (this.db.connectionStatus !== ConnectionStatus.Connected)
						return (true);

					if (onRegisteringRoute != null)
						await onRegisteringRoute (this.db);
				}

				return (true);
			};

		this.addMethod ({
			"name": "add",
			"onServerExecute": this.add,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to add data to."
				},
				"fields": {
					"type": "string",
					"required": true,
					"description": 
						`The fields and their values to add to the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Add results to the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"addTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.add ({
							"schema": "users",
							"fields": {
								"name": "Test_User",
								"email": "test@test.com"
							}
						});

					driver.assert (resp === true, "Unable to add item!");
				}
			]
		});
		this.addMethod ({
			"name": "edit",
			"onServerExecute": this.edit,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to edit data in."
				},
				"whereFields": {
					"type": "string",
					"required": true,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				},
				"fields": {
					"type": "string",
					"required": true,
					"description": 
						`The fields and their values to update in the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Update the results in the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"editTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.edit ({
							"schema": "users",
							"whereFields": {
								"name": "Test_User"
							},
							"fields": {
								"name": "Test_User_Updated",
								"email": "test_updated@test.com"
							}
						});

					driver.assert (resp === true, "Unable to edit item!");
				}
			]
		});
		this.addMethod ({
			"name": "remove",
			"onServerExecute": this.remove,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to remove data from."
				},
				"whereFields": {
					"type": "string",
					"required": true,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Remove results from the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"removeTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.remove ({
							"schema": "users",
							"whereFields": {
								"name": "Test_User_Updated"
							}
						});

					driver.assert (resp === true, "Unable to remove item!");
					driver.persistentData.hasRemoved = true;
				}
			]
		});
		this.addMethod ({
			"name": "list",
			"onServerExecute": this.list,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to access."
				},
				"whereFields": {
					"type": "array",
					"required": false,
					"description": 
						`The where fields and their values to select from the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				},
				"fields": {
					"type": "array",
					"required": true,
					"description": "The list of fields in the schema to access."
				},
				"offset": {
					"type": "int",
					"required": false,
					"description": "The offset."
				},
				"limit": {
					"type": "int",
					"required": false,
					"description": "The max number of results to return. Default is 20."
				}
			},
			"description": "List results from a schema.",
			"returns": "Returns the results from the schema.",
			"testCases": [
				"listTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.list ({
							"schema": "users"
						});

					if (driver.persistentData.hasRemoved != null)
					{
						if (driver.persistentData.hasRemoved === true)
							driver.assert (resp.length === 0, "Not all items have been removed!");

						return;
					}

					const name: string = resp[0].name;
					driver.assert (name === "Test_User_Updated", "Unable to list items!");
				}
			]
		});
	}

	/**
	 * Add some data.
	 */
	protected async add (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let fields: any = HotStaq.getParam ("fields", req.jsonObj);
		let insertQuery: string = "";
		let insertArray = [schema];

		for (let key in fields)
		{
			let value: any = fields[key];
			let beginStr: string = "";
			let endStr: string = "";

			if (this.onInsertField != null)
			{
				value = await this.onInsertField (schema, key, value);

				if (value === undefined)
					continue;

				if (value != null)
				{
					if (value.beginStr != null)
						beginStr = value.beginStr;

					if (value.endStr != null)
						endStr = value.endStr;

					if (value.value != null)
						value = value.value;
				}
			}

			insertQuery += `?? = ${beginStr}?${endStr}, `;
			insertArray.push (key);
			insertArray.push (value);
		}

		if (insertArray.length > 1)
			insertQuery = insertQuery.substring (0, (insertQuery.length - 2));

		let result = await this.db.query (`insert into ?? set ${insertQuery};`, insertArray);

		if (result.error != null)
			throw new Error (result.error);

		return (true);
	}

	/**
	 * Edit some data.
	 */
	protected async edit (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParam ("whereFields", req.jsonObj);
		let fields: any = HotStaq.getParam ("fields", req.jsonObj);
		let updateQuery: string = "";
		let whereQuery: string = "";
		let updateArray = [schema];

		let addedUpdateArray: boolean = false;

		for (let key in fields)
		{
			let value: any = fields[key];
			let beginStr: string = "";
			let endStr: string = "";

			if (this.onUpdateField != null)
			{
				value = await this.onUpdateField (schema, key, value);

				if (value === undefined)
					continue;

				if (value != null)
				{
					if (value.beginStr != null)
						beginStr = value.beginStr;

					if (value.endStr != null)
						endStr = value.endStr;

					if (value.value != null)
						value = value.value;
				}
			}

			updateQuery += `?? = ${beginStr}?${endStr}, `;

			updateArray.push (key);
			updateArray.push (value);
			addedUpdateArray = true;
		}

		if (addedUpdateArray === true)
			updateQuery = updateQuery.substring (0, (updateQuery.length - 2));

		for (let key in whereFields)
		{
			let value: any = whereFields[key];
			let beginStr: string = "";
			let endStr: string = "";

			if (this.onUpdateWhereField != null)
			{
				value = await this.onUpdateWhereField (schema, key, value);

				if (value === undefined)
					continue;

				if (value != null)
				{
					if (value.beginStr != null)
						beginStr = value.beginStr;

					if (value.endStr != null)
						endStr = value.endStr;

					if (value.value != null)
						value = value.value;
				}
			}

			whereQuery += `?? = ${beginStr}?${endStr} AND `;
			updateArray.push (key);
			updateArray.push (value);
		}

		if (updateArray.length > 1)
			whereQuery = whereQuery.substring (0, (whereQuery.length - 5));

		let strtemp: string = this.db.db.format (`update ?? set ${updateQuery} where ${whereQuery};`, updateArray);
		let result = await this.db.query (strtemp, updateArray);

		if (result.error != null)
			throw new Error (result.error);

		return (true);
	}

	/**
	 * List some data.
	 */
	protected async list (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParamDefault ("whereFields", req.jsonObj, {});
		let offset: number = HotStaq.getParamDefault ("offset", req.jsonObj, null);
		let limit: number = HotStaq.getParamDefault ("limit", req.jsonObj, 20);

		let queryStr: string = "select * from ??";
		let values: any = [schema];

		const whereFieldsCount: number = Object.keys (whereFields).length;

		if (whereFieldsCount > 0)
			queryStr += " where ";

		for (let key in whereFields)
		{
			let fieldElement = whereFields[key];
			let value = fieldElement.value;
			let beginStr: string = "";
			let endStr: string = "";

			if (this.onListWhereField != null)
			{
				value = await this.onListWhereField (schema, key, value);

				if (value === undefined)
					continue;

				if (value != null)
				{
					if (value.beginStr != null)
						beginStr = value.beginStr;

					if (value.endStr != null)
						endStr = value.endStr;

					if (value.value != null)
						value = value.value;
				}
			}

			queryStr += `?? = ${beginStr}?${endStr} AND `;

			values.push (key);
			values.push (value);
		}

		if (values.length > 1)
			queryStr = queryStr.substring (0, (queryStr.length - 5));

		if (offset != null)
		{
			queryStr += ` offset ? `;
			values.push (offset);
		}

		if (limit != null)
		{
			queryStr += ` limit ? `;
			values.push (limit);
		}

		let result = await this.db.query (queryStr, values);

		if (result.error != null)
			throw result.error;

		this.logger.verbose (JSON.stringify (result));
		let results = result.results;

		results = this.onListFilterResults (results);

		return (results);
	}

	/**
	 * Remove some data.
	 */
	protected async remove (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let whereFields: any = HotStaq.getParamDefault ("whereFields", req.jsonObj, {});

		let queryStr: string = "delete from ??";
		let whereQuery: string = "";
		let values: any = [schema];

		const whereFieldsCount: number = Object.keys (whereFields).length;

		for (let key in whereFields)
		{
			let value: any = whereFields[key];
			let beginStr: string = "";
			let endStr: string = "";

			if (this.onRemoveWhereField != null)
			{
				value = await this.onRemoveWhereField (schema, key, value);

				if (value === undefined)
					continue;

				if (value != null)
				{
					if (value.beginStr != null)
						beginStr = value.beginStr;

					if (value.endStr != null)
						endStr = value.endStr;

					if (value.value != null)
						value = value.value;
				}
			}

			whereQuery += `?? = ${beginStr}?${endStr} AND `;

			values.push (key);
			values.push (value);
		}

		if (whereFieldsCount > 0)
			queryStr += " where " + whereQuery.substring (0, (whereQuery.length - 5));

		let strtemp: string = this.db.db.format (queryStr, values);
		let result = await this.db.query (queryStr, values);

		if (result.error != null)
			throw result.error;

		this.logger.verbose (JSON.stringify (result));
		let results = result.results;

		return (results);
	}
}